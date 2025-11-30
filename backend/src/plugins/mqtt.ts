import fp from 'fastify-plugin';
import mqtt from 'mqtt';
import { config } from '../config/env';
import { FastifyInstance } from 'fastify';
import { MqttRepository } from '../modules/mqtt/mqttRepository';
import { MqttMessageHandler } from '../modules/mqtt/mqttMessageHandler';
import type {
    MqttMeasurement,
    DeviceStatusUpdate,
    ModuleConfig,
    SystemData,
    SystemConfigData,
    SensorsStatusData,
    SensorsConfigData,
    HardwareData
} from '../types/mqtt';

declare module 'fastify' {
    interface FastifyInstance {
        mqtt: mqtt.MqttClient;
        publishConfig: (moduleId: string, config: ModuleConfig) => boolean;
    }
}

export default fp(async (fastify: FastifyInstance) => {
    const client = mqtt.connect(config.mqtt.broker);
    const mqttRepo = new MqttRepository(fastify.db);

    // --- BUFFERING SYSTEM ---
    let measurementBuffer: MqttMeasurement[] = [];
    let statusUpdateBuffer: DeviceStatusUpdate[] = [];
    const BATCH_SIZE = 100;
    const FLUSH_INTERVAL = 5000;

    async function flushMeasurements() {
        if (measurementBuffer.length === 0) return;

        const batch = [...measurementBuffer];
        measurementBuffer = [];

        try {
            await mqttRepo.insertMeasurementsBatch(batch);
            fastify.log.info(`✅ Inserted ${batch.length} measurements into measurements`);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            fastify.log.error(`❌ Batch Insert Error: ${errorMessage}`);
            fastify.log.error(`❌ Failed batch details: ${JSON.stringify(batch.slice(0, 3))}`);
        }
    }

    async function flushStatusUpdates() {
        if (statusUpdateBuffer.length === 0) return;

        const batch = [...statusUpdateBuffer];
        statusUpdateBuffer = [];

        for (const update of batch) {
            try {
                await handleDeviceStatusUpdate(mqttRepo, update);
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Unknown error';
                fastify.log.error(`❌ Status Update Error: ${errorMessage}`);
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
        republishAllConfigs(fastify, mqttRepo);
    });

    client.on('error', (err) => {
        fastify.log.error(`❌ MQTT connection error: ${err.message}`);
    });

    const messageHandler = new MqttMessageHandler(
        fastify,
        mqttRepo,
        measurementBuffer,
        statusUpdateBuffer,
        async () => {
            await flushStatusUpdates();
        },
        async () => {
            await flushMeasurements();
        }
    );

    client.on('message', async (topic, message) => {
        await messageHandler.handleMessage(topic, message);
    });

    fastify.decorate('mqtt', client);
    fastify.decorate('publishConfig', (moduleId: string, config: ModuleConfig) => {
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

async function handleDeviceStatusUpdate(
    mqttRepo: MqttRepository,
    update: DeviceStatusUpdate
): Promise<void> {
    const { moduleId, type, data } = update;

    switch (type) {
        case 'system':
            await mqttRepo.updateSystemStatus(moduleId, data as SystemData);
            break;
        case 'system_config':
            await mqttRepo.updateSystemConfig(moduleId, data as SystemConfigData);
            break;
        case 'sensors_status':
            await mqttRepo.updateSensorStatus(moduleId, data as SensorsStatusData);
            break;
        case 'sensors_config':
            await mqttRepo.updateSensorConfig(moduleId, data as SensorsConfigData);
            break;
        case 'hardware':
            await mqttRepo.updateHardware(moduleId, data as HardwareData);
            break;
    }
}

async function republishAllConfigs(
    fastify: FastifyInstance,
    mqttRepo: MqttRepository
): Promise<void> {
    try {
        const configsByModule = await mqttRepo.getEnabledSensorConfigs();

        // Publish configs
        for (const [moduleId, config] of Object.entries(configsByModule)) {
            fastify.publishConfig(moduleId, config);
        }

        fastify.log.info(`✅ Republished configs for ${Object.keys(configsByModule).length} modules`);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        fastify.log.error(`❌ Error republishing configs: ${errorMessage}`);
    }
}
