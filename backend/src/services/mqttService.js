const mqtt = require('mqtt');
const config = require('../config/env');
const { getPool } = require('../db/database');

let mqttClient = null;
let ioInstance = null;

// --- OPTIMIZATION STORAGE ---
const lastSavedTime = new Map(); // Garde en mémoire le dernier timestamp d'enregistrement par topic

// --- BUFFERING SYSTEM ---
// Stocke les messages en mémoire avant insertion groupée pour soulager la DB
let messageBuffer = []; 
const BATCH_SIZE = 100; // Déclenche l'insertion si on atteint 100 messages
const FLUSH_INTERVAL = 5000; // Déclenche l'insertion toutes les 5 secondes max

// Fonction pour vider le buffer et insérer en lot (Batch Insert)
async function flushBuffer() {
    if (messageBuffer.length === 0) return;

    // On récupère tout le contenu actuel du buffer et on le vide atomiquement
    // Cela évite les conflits si de nouveaux messages arrivent pendant l'insertion
    const batch = [...messageBuffer];
    messageBuffer = []; 

    const pool = getPool();
    if (!pool) return;

    try {
        // Construction de la requête SQL optimisée pour l'insertion multiple
        // INSERT INTO measurements ... VALUES ($1, $2, $3, $4), ($5, $6, $7, $8), ...
        const values = [];
        const placeholders = batch.map((msg, index) => {
            const i = index * 4; // 4 paramètres par ligne
            values.push(new Date(), msg.topic, msg.value, msg.metadata); // NOW() calculé ici par JS
            return `($${i+1}, $${i+2}, $${i+3}, $${i+4})`;
        }).join(', ');

        const query = `INSERT INTO measurements (time, topic, value, metadata) VALUES ${placeholders}`;
        
        await pool.query(query, values);
        // console.log(`📦 Batch inséré : ${batch.length} messages`);

    } catch (err) {
        console.error('❌ Erreur Batch Insert:', err.message);
        // Optionnel : En cas d'erreur critique, on pourrait remettre dans le buffer, 
        // mais ici on préfère perdre le lot plutôt que de bloquer indéfiniment.
    }
}

// Timer régulier pour vider le buffer même s'il n'est pas plein
setInterval(flushBuffer, FLUSH_INTERVAL);

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

        // 2. Sauvegarde DB (Mise en Buffer avec Filtre 1 minute)
        // On ne stocke en base qu'une seule mesure par minute pour économiser l'espace
        const now = Date.now();
        const lastTime = lastSavedTime.get(topic) || 0;

        if (now - lastTime >= 60000) { // 60000ms = 1 minute
            messageBuffer.push({ topic, value, metadata });
            lastSavedTime.set(topic, now);

            // Si le buffer est plein, on vide tout de suite
            if (messageBuffer.length >= BATCH_SIZE) {
                flushBuffer();
            }
        }
    });

    return mqttClient;
}

module.exports = { initMqtt };

