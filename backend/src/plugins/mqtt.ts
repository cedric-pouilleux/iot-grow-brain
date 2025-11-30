import fp from 'fastify-plugin';
import mqtt from 'mqtt';
import { config } from '../config/env';
import { FastifyInstance } from 'fastify';

declare module 'fastify' {
    interface FastifyInstance {
        mqtt: mqtt.MqttClient;
        publishConfig: (moduleId: string, config: any) => boolean;
    }
}

interface MqttMessage {
    topic: string;
    value: number | null;
    metadata: any | null;
}

export default fp(async (fastify: FastifyInstance) => {
    const client = mqtt.connect(config.mqtt.broker);

    // --- BUFFERING SYSTEM ---
    let messageBuffer: MqttMessage[] = [];
    const BATCH_SIZE = 100;
    const FLUSH_INTERVAL = 5000;

    async function flushBuffer() {
        if (messageBuffer.length === 0) return;

        const batch = [...messageBuffer];
        messageBuffer = [];

        try {
            const values: any[] = [];
            const placeholders = batch.map((msg, index) => {
                const i = index * 4;
                values.push(new Date(), msg.topic, msg.value, msg.metadata);
                return `($${i + 1}, $${i + 2}, $${i + 3}, $${i + 4})`;
            }).join(', ');

            const query = `INSERT INTO measurements (time, topic, value, metadata) VALUES ${placeholders}`;
            await fastify.db.query(query, values);
            // fastify.log.info(`📦 Batch inserted: ${batch.length} messages`);
        } catch (err: any) {
            fastify.log.error(`❌ Batch Insert Error: ${err.message}`);
        }
    }

    setInterval(flushBuffer, FLUSH_INTERVAL);

    client.on('connect', () => {
        fastify.log.info('✅ Connected to MQTT broker');
        client.subscribe('#', (err) => {
            if (!err) fastify.log.info('✅ Subscribed to all topics (#)');
        });
        republishAllConfigs(fastify);
    });

    client.on('error', (err) => {
        fastify.log.error(`❌ MQTT connection error: ${err.message}`);
    });

    client.on('message', async (topic, message) => {
        const payload = message.toString();
        let value: number | null = null;
        let metadata: any = null;

        try {
            if (topic.endsWith('/system') || topic.endsWith('/system/config') || topic.endsWith('/sensors/status') || topic.endsWith('/sensors/config') || topic.endsWith('/hardware/config')) {
                metadata = JSON.parse(payload);
            } else {
                value = parseFloat(payload);
                if (isNaN(value)) return;
            }
        } catch (e) {
            return;
        }

        // 1. WebSocket Broadcast
        if (fastify.io) {
            fastify.io.emit('mqtt:data', {
                topic,
                value,
                metadata,
                time: new Date().toISOString()
            });
        }

        // 2. Device Status Update
        if (metadata && (topic.endsWith('/system') || topic.endsWith('/system/config') || topic.endsWith('/sensors/status') || topic.endsWith('/sensors/config') || topic.endsWith('/hardware/config'))) {
            await handleDeviceStatus(fastify, topic, metadata);
            return;
        }

        // 3. Buffer Measurement
        if (value !== null) {
            messageBuffer.push({ topic, value, metadata });
            if (messageBuffer.length >= BATCH_SIZE) {
                flushBuffer();
            }
        }
    });

    fastify.decorate('mqtt', client);
    fastify.decorate('publishConfig', (moduleId: string, config: any) => {
        if (!client) return false;
        const topic = `${moduleId}/sensors/config`;
        const payload = JSON.stringify(config);
        client.publish(topic, payload, { retain: true, qos: 1 });
        return true;
    });

    fastify.addHook('onClose', (instance, done) => {
        client.end();
        done();
    });
});

async function handleDeviceStatus(fastify: FastifyInstance, topic: string, metadata: any) {
    let moduleId = topic;
    if (topic.endsWith('/system/config')) moduleId = topic.slice(0, -'/system/config'.length);
    else if (topic.endsWith('/system')) moduleId = topic.slice(0, -'/system'.length);
    else if (topic.endsWith('/sensors/status')) moduleId = topic.slice(0, -'/sensors/status'.length);
    else if (topic.endsWith('/sensors/config')) moduleId = topic.slice(0, -'/sensors/config'.length);
    else if (topic.endsWith('/hardware/config')) moduleId = topic.slice(0, -'/hardware/config'.length);

    if (moduleId.startsWith('home/') || moduleId.startsWith('dev/') || moduleId === 'test-module') return;

    try {
        const result = await fastify.db.query('SELECT status_data FROM device_status WHERE module_id = $1', [moduleId]);
        let existingData: any = {};
        if (result.rows.length > 0 && result.rows[0].status_data) {
            existingData = result.rows[0].status_data;
        }

        // Merge logic (simplified for brevity, but keeping core logic)
        if (topic.endsWith('/system')) {
            if (!existingData.system) existingData.system = {};
            existingData.system.rssi = metadata.rssi;
            if (metadata.memory) {
                if (!existingData.system.memory) existingData.system.memory = {};
                if (metadata.memory.heap_free_kb !== undefined) existingData.system.memory.heap_free_kb = metadata.memory.heap_free_kb;
                if (metadata.memory.heap_min_free_kb !== undefined) existingData.system.memory.heap_min_free_kb = metadata.memory.heap_min_free_kb;
                if (metadata.memory.psram) existingData.system.memory.psram = { ...existingData.system.memory.psram, ...metadata.memory.psram };
            }
        } else if (topic.endsWith('/system/config')) {
            if (!existingData.system) existingData.system = {};
            existingData.system.ip = metadata.ip;
            existingData.system.mac = metadata.mac;
            existingData.system.uptime_start = metadata.uptime_start;
            existingData.system.flash = metadata.flash;
            if (metadata.memory) {
                if (!existingData.system.memory) existingData.system.memory = {};
                if (metadata.memory.heap_total_kb !== undefined) existingData.system.memory.heap_total_kb = metadata.memory.heap_total_kb;
                if (metadata.memory.psram) existingData.system.memory.psram = metadata.memory.psram;
            }
        } else if (topic.endsWith('/sensors/status')) {
            if (!existingData.sensors) existingData.sensors = {};
            Object.keys(metadata).forEach(sensorName => {
                if (!existingData.sensors[sensorName]) existingData.sensors[sensorName] = {};
                existingData.sensors[sensorName].status = metadata[sensorName].status;
                existingData.sensors[sensorName].value = metadata[sensorName].value;
            });
        } else if (topic.endsWith('/sensors/config')) {
            if (!existingData.sensorsConfig) existingData.sensorsConfig = {};
            Object.keys(metadata).forEach(sensorName => {
                if (!existingData.sensorsConfig[sensorName]) existingData.sensorsConfig[sensorName] = {};
                existingData.sensorsConfig[sensorName] = { ...existingData.sensorsConfig[sensorName], ...metadata[sensorName] };
            });
        } else if (topic.endsWith('/hardware/config')) {
            existingData.hardware = metadata;
        }

        await fastify.db.query(`
            INSERT INTO device_status (module_id, status_data, updated_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (module_id) 
            DO UPDATE SET status_data = $2, updated_at = NOW()
        `, [moduleId, JSON.stringify(existingData)]);

    } catch (err: any) {
        fastify.log.error(`⚠️ Error saving hardware info: ${err.message}`);
    }
}

async function republishAllConfigs(fastify: FastifyInstance) {
    try {
        const result = await fastify.db.query('SELECT module_id, status_data FROM device_status');
        for (const row of result.rows) {
            const data = row.status_data;
            if (data && data.sensorsConfig && data.sensorsConfig.sensors) {
                fastify.publishConfig(row.module_id, { sensors: data.sensorsConfig.sensors });
            }
        }
    } catch (err: any) {
        fastify.log.error(`❌ Error republishing configs: ${err.message}`);
    }
}
