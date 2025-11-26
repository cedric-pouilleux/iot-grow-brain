const mqtt = require('mqtt');
const config = require('../config/env');
const { getPool } = require('../db/database');

let mqttClient = null;
let ioInstance = null;

function initMqtt(io) {
    ioInstance = io;
    console.log(`Connexion au broker MQTT ${config.mqtt.broker}...`);
    mqttClient = mqtt.connect(config.mqtt.broker);

    mqttClient.on('connect', () => {
        console.log('✅ Connecté au broker MQTT !');
        mqttClient.subscribe('#', (err) => {
            if (!err) console.log(`✅ Abonné à tous les topics (#)`);
        });
    });

    mqttClient.on('error', (err) => {
        console.error('❌ Erreur connexion MQTT:', err.message);
    });

    mqttClient.on('message', async (topic, message) => {
        const payload = message.toString();
        let value = null;
        let metadata = null;

        // Parsing
        try {
            if (topic.endsWith('/status')) {
                metadata = JSON.parse(payload);
            } else {
                value = parseFloat(payload);
                if (isNaN(value)) return;
            }
        } catch (e) {
            return;
        }

        // 1. Emission WebSocket Temps Réel
        if (ioInstance) {
            // console.log('🚀 Emission WebSocket:', topic);
            ioInstance.emit('mqtt:data', {
                topic: topic,
                value: value,
                metadata: metadata,
                time: new Date().toISOString()
            });
        }

        // 2. Sauvegarde DB
        const pool = getPool();
        if (pool) {
            try {
                await pool.query(
                    `INSERT INTO measurements (time, topic, value, metadata) VALUES (NOW(), $1, $2, $3)`,
                    [topic, value, metadata]
                );
            } catch (err) {
                console.error('❌ Erreur sauvegarde DB:', err.message);
            }
        }
    });

    return mqttClient;
}

module.exports = { initMqtt };

