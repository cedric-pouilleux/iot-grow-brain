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
    time: Date;
    moduleId: string;
    sensorType: string;
    value: number;
}

interface DeviceStatusUpdate {
    moduleId: string;
    type: 'system' | 'system_config' | 'sensors_status' | 'sensors_config' | 'hardware';
    data: any;
}

export default fp(async (fastify: FastifyInstance) => {
    const client = mqtt.connect(config.mqtt.broker);

    // --- BUFFERING SYSTEM ---
    let measurementBuffer: MqttMessage[] = [];
    let statusUpdateBuffer: DeviceStatusUpdate[] = [];
    const BATCH_SIZE = 100;
    const FLUSH_INTERVAL = 5000;

    async function flushMeasurements() {
        if (measurementBuffer.length === 0) return;

        const batch = [...measurementBuffer];
        measurementBuffer = [];

        try {
            const values: any[] = [];
            const placeholders = batch.map((msg, index) => {
                const i = index * 4;
                values.push(msg.time, msg.moduleId, msg.sensorType, msg.value);
                return `($${i + 1}, $${i + 2}, $${i + 3}, $${i + 4})`;
            }).join(', ');

            const query = `INSERT INTO measurements (time, module_id, sensor_type, value) VALUES ${placeholders}`;
            await fastify.db.query(query, values);
            fastify.log.info(`✅ Inserted ${batch.length} measurements into measurements`);
        } catch (err: any) {
            fastify.log.error(`❌ Batch Insert Error: ${err.message}`);
            fastify.log.error(`❌ Failed batch details: ${JSON.stringify(batch.slice(0, 3))}`);
        }
    }

    async function flushStatusUpdates() {
        if (statusUpdateBuffer.length === 0) return;

        const batch = [...statusUpdateBuffer];
        statusUpdateBuffer = [];

        for (const update of batch) {
            try {
                await handleDeviceStatusOptimized(fastify, update);
            } catch (err: any) {
                fastify.log.error(`❌ Status Update Error: ${err.message}`);
            }
        }
    }

    setInterval(flushMeasurements, FLUSH_INTERVAL);
    setInterval(flushStatusUpdates, FLUSH_INTERVAL / 2);

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
        const now = new Date();

        // Parse topic structure: module_id/category/sensor_type
        const parts = topic.split('/');
        if (parts.length < 2) {
            fastify.log.debug(`⚠️ Topic ignored (too short): ${topic}`);
            return;
        }

        const moduleId = parts[0];

        // Skip test topics
        if (moduleId.startsWith('home/') || moduleId.startsWith('dev/') || moduleId === 'test-module') {
            return;
        }

        // Handle different message types
        if (topic.endsWith('/system') || topic.endsWith('/system/config')) {
            try {
                const metadata = JSON.parse(payload);
                const type = topic.endsWith('/config') ? 'system_config' : 'system';
                statusUpdateBuffer.push({ moduleId, type, data: metadata });

                if (statusUpdateBuffer.length >= BATCH_SIZE / 2) {
                    await flushStatusUpdates();
                }
            } catch (e) {
                fastify.log.warn(`⚠️ Failed to parse system message from ${topic}: ${e}`);
                return;
            }
        } else if (topic.endsWith('/sensors/status')) {
            try {
                const metadata = JSON.parse(payload);
                statusUpdateBuffer.push({ moduleId, type: 'sensors_status', data: metadata });
            } catch (e) {
                fastify.log.warn(`⚠️ Failed to parse sensors/status from ${topic}: ${e}`);
                return;
            }
        } else if (topic.endsWith('/sensors/config')) {
            try {
                const metadata = JSON.parse(payload);
                statusUpdateBuffer.push({ moduleId, type: 'sensors_config', data: metadata });
            } catch (e) {
                fastify.log.warn(`⚠️ Failed to parse sensors/config from ${topic}: ${e}`);
                return;
            }
        } else if (topic.endsWith('/hardware/config')) {
            try {
                const metadata = JSON.parse(payload);
                statusUpdateBuffer.push({ moduleId, type: 'hardware', data: metadata });
            } catch (e) {
                fastify.log.warn(`⚠️ Failed to parse hardware/config from ${topic}: ${e}`);
                return;
            }
        } else if (parts[1] === 'sensors' && parts.length === 3) {
            // Sensor measurement: module_id/sensors/sensor_type
            const sensorType = parts[2];
            const value = parseFloat(payload);

            if (!isNaN(value)) {
                measurementBuffer.push({ time: now, moduleId, sensorType, value });
                fastify.log.info(`📊 Measurement buffered: ${moduleId}/sensors/${sensorType} = ${value} (buffer: ${measurementBuffer.length})`);

                if (measurementBuffer.length >= BATCH_SIZE) {
                    await flushMeasurements();
                }
            } else {
                fastify.log.warn(`⚠️ Invalid measurement value from ${topic}: "${payload}"`);
            }
        } else if (parts.length === 2) {
            // Sensor measurement: module_id/sensor_type (format ESP32 sans /sensors/)
            // Supporte: co2, temperature, humidity
            const sensorType = parts[1];
            const value = parseFloat(payload);

            if (!isNaN(value) && (sensorType === 'co2' || sensorType === 'temperature' || sensorType === 'humidity')) {
                measurementBuffer.push({ time: now, moduleId, sensorType, value });
                fastify.log.info(`📊 Measurement buffered: ${moduleId}/${sensorType} = ${value} (buffer: ${measurementBuffer.length})`);

                if (measurementBuffer.length >= BATCH_SIZE) {
                    await flushMeasurements();
                }
            } else {
                fastify.log.debug(`⚠️ Topic not a sensor measurement: ${topic} (value: ${payload})`);
            }
        } else {
            fastify.log.info(`⚠️ Topic not processed: ${topic} (parts: ${parts.join(', ')})`);
        }

        // WebSocket Broadcast (keep for real-time updates)
        // Envoyer les données parsées correctement
        if (fastify.io) {
            let wsValue: number | null = null;
            let wsMetadata: any | null = null;

            // Déterminer si c'est une valeur numérique ou un JSON
            if (topic.endsWith('/system') || topic.endsWith('/system/config') || 
                topic.endsWith('/sensors/status') || topic.endsWith('/sensors/config') || 
                topic.endsWith('/hardware/config')) {
                // C'est un message JSON (metadata)
                try {
                    wsMetadata = JSON.parse(payload);
                } catch (e) {
                    // Ignorer si le parsing échoue
                }
            } else if (parts.length === 2 || (parts[1] === 'sensors' && parts.length === 3)) {
                // C'est une mesure de capteur (valeur numérique)
                const numValue = parseFloat(payload);
                if (!isNaN(numValue)) {
                    wsValue = numValue;
                }
            }

            // Ne broadcaster que si on a une valeur ou metadata valide
            if (wsValue !== null || wsMetadata !== null) {
                fastify.io.emit('mqtt:data', {
                    topic,
                    value: wsValue,
                    metadata: wsMetadata,
                    time: now.toISOString()
                });
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
        flushMeasurements();
        flushStatusUpdates();
        client.end();
        done();
    });
});

async function handleDeviceStatusOptimized(fastify: FastifyInstance, update: DeviceStatusUpdate) {
    const { moduleId, type, data } = update;

    try {
        if (type === 'system') {
            // Update system status (real-time data)
            await fastify.db.query(`
                INSERT INTO device_system_status (
                    module_id, rssi, heap_free_kb, heap_min_free_kb, updated_at
                )
                VALUES ($1, $2, $3, $4, NOW())
                ON CONFLICT (module_id) DO UPDATE SET
                    rssi = EXCLUDED.rssi,
                    heap_free_kb = COALESCE(EXCLUDED.heap_free_kb, device_system_status.heap_free_kb),
                    heap_min_free_kb = COALESCE(EXCLUDED.heap_min_free_kb, device_system_status.heap_min_free_kb),
                    updated_at = NOW()
            `, [
                moduleId,
                data.rssi,
                data.memory?.heap_free_kb,
                data.memory?.heap_min_free_kb
            ]);
        } else if (type === 'system_config') {
            // Update system config (static data)
            await fastify.db.query(`
                INSERT INTO device_system_status (
                    module_id, ip, mac, uptime_start, 
                    flash_used_kb, flash_free_kb, flash_system_kb,
                    heap_total_kb, updated_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
                ON CONFLICT (module_id) DO UPDATE SET
                    ip = COALESCE(EXCLUDED.ip, device_system_status.ip),
                    mac = COALESCE(EXCLUDED.mac, device_system_status.mac),
                    uptime_start = COALESCE(EXCLUDED.uptime_start, device_system_status.uptime_start),
                    flash_used_kb = COALESCE(EXCLUDED.flash_used_kb, device_system_status.flash_used_kb),
                    flash_free_kb = COALESCE(EXCLUDED.flash_free_kb, device_system_status.flash_free_kb),
                    flash_system_kb = COALESCE(EXCLUDED.flash_system_kb, device_system_status.flash_system_kb),
                    heap_total_kb = COALESCE(EXCLUDED.heap_total_kb, device_system_status.heap_total_kb),
                    updated_at = NOW()
            `, [
                moduleId,
                data.ip,
                data.mac,
                data.uptime_start,
                data.flash?.used_kb,
                data.flash?.free_kb,
                data.flash?.system_kb,
                data.memory?.heap_total_kb
            ]);
        } else if (type === 'sensors_status') {
            // Update sensor status
            const queries = Object.keys(data).map(sensorType => {
                const sensor = data[sensorType];
                return fastify.db.query(`
                    INSERT INTO sensor_status (module_id, sensor_type, status, value, updated_at)
                    VALUES ($1, $2, $3, $4, NOW())
                    ON CONFLICT (module_id, sensor_type) DO UPDATE SET
                        status = EXCLUDED.status,
                        value = EXCLUDED.value,
                        updated_at = NOW()
                `, [moduleId, sensorType, sensor.status, sensor.value]);
            });
            await Promise.all(queries);
        } else if (type === 'sensors_config') {
            // Update sensor config
            const queries = Object.keys(data).map(sensorType => {
                const sensor = data[sensorType];
                return fastify.db.query(`
                    INSERT INTO sensor_config (module_id, sensor_type, interval_seconds, model, updated_at)
                    VALUES ($1, $2, $3, $4, NOW())
                    ON CONFLICT (module_id, sensor_type) DO UPDATE SET
                        interval_seconds = COALESCE(EXCLUDED.interval_seconds, sensor_config.interval_seconds),
                        model = COALESCE(EXCLUDED.model, sensor_config.model),
                        updated_at = NOW()
                `, [moduleId, sensorType, sensor.interval, sensor.model]);
            });
            await Promise.all(queries);
        } else if (type === 'hardware') {
            // Update hardware info
            await fastify.db.query(`
                INSERT INTO device_hardware (
                    module_id, chip_model, chip_rev, cpu_freq_mhz, flash_kb, cores, updated_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, NOW())
                ON CONFLICT (module_id) DO UPDATE SET
                    chip_model = EXCLUDED.chip_model,
                    chip_rev = EXCLUDED.chip_rev,
                    cpu_freq_mhz = EXCLUDED.cpu_freq_mhz,
                    flash_kb = EXCLUDED.flash_kb,
                    cores = EXCLUDED.cores,
                    updated_at = NOW()
            `, [
                moduleId,
                data.chip?.model,
                data.chip?.rev,
                data.chip?.cpu_freq_mhz,
                data.chip?.flash_kb,
                data.chip?.cores
            ]);
        }
    } catch (err: any) {
        fastify.log.error(`⚠️ Error updating ${type} for ${moduleId}: ${err.message}`);
    }
}

async function republishAllConfigs(fastify: FastifyInstance) {
    try {
        const result = await fastify.db.query(`
            SELECT module_id, sensor_type, interval_seconds
            FROM sensor_config
            WHERE enabled = true
        `);

        // Group by module
        const configsByModule: Record<string, any> = {};
        for (const row of result.rows) {
            if (!configsByModule[row.module_id]) {
                configsByModule[row.module_id] = { sensors: {} };
            }
            configsByModule[row.module_id].sensors[row.sensor_type] = {
                interval: row.interval_seconds
            };
        }

        // Publish configs
        for (const [moduleId, config] of Object.entries(configsByModule)) {
            fastify.publishConfig(moduleId, config);
        }

        fastify.log.info(`✅ Republished configs for ${Object.keys(configsByModule).length} modules`);
    } catch (err: any) {
        fastify.log.error(`❌ Error republishing configs: ${err.message}`);
    }
}
