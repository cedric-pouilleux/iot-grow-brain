const mqtt = require('mqtt');
const config = require('../config/env');
const { getPool } = require('../db/database');
const { recordSystemMetricsFromStatus } = require('./metricsService');

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
            if (topic.endsWith('/system') || topic.endsWith('/system/config') || topic.endsWith('/sensors/status') || topic.endsWith('/sensors/config') || topic.endsWith('/hardware/config')) {
                metadata = JSON.parse(payload);
            } else {
                value = parseFloat(payload);
                if (isNaN(value)) {
                    return;
                }
            }
        } catch (e) {
            console.error(`   ❌ ERREUR parsing JSON: ${e.message}`);
            console.error(`   Payload complet (${payload.length} chars):`);
            console.error(payload);
            
            // Tentative de trouver où est l'erreur
            try {
                // Essayer de parser avec JSON.parse pour voir l'erreur exacte
                JSON.parse(payload);
            } catch (parseError) {
                console.error(`   Position erreur: ${parseError.message}`);
            }
            return;
        }

        // 1. Emission WebSocket Temps Réel
        if (ioInstance) {
            const wsData = {
                topic: topic,
                value: value,
                metadata: metadata,
                time: new Date().toISOString()
            };
            ioInstance.emit('mqtt:data', wsData);
        }

        // 2. Stockage des infos hardware dans la table device_status (écrasée à chaque fois)
        if ((topic.endsWith('/system') || topic.endsWith('/system/config') || topic.endsWith('/sensors/status') || topic.endsWith('/sensors/config') || topic.endsWith('/hardware/config')) && metadata) {
            const moduleId = topic.replace('/system', '').replace('/system/config', '').replace('/sensors/status', '').replace('/sensors/config', '').replace('/hardware/config', '');
            const pool = getPool();
            
            if (pool) {
                // Récupérer les données existantes ou créer un nouvel objet
                pool.query(`
                    SELECT status_data FROM device_status WHERE module_id = $1
                `, [moduleId])
                .then(result => {
                    let existingData = {};
                    if (result.rows.length > 0 && result.rows[0].status_data) {
                        existingData = result.rows[0].status_data;
                    }
                    
                    // Fusionner les nouvelles données avec les existantes
                    if (topic.endsWith('/system')) {
                        // Données dynamiques (rssi, memory dynamique) - fusion avec config existante
                        if (!existingData.system) {
                            existingData.system = {};
                        }
                        existingData.system.rssi = metadata.rssi;
                        // Fusionner seulement les valeurs dynamiques de memory (sans écraser heap_total_kb)
                        if (metadata.memory) {
                            if (!existingData.system.memory) {
                                existingData.system.memory = {};
                            }
                            if (metadata.memory.heap_free_kb !== undefined) {
                                existingData.system.memory.heap_free_kb = metadata.memory.heap_free_kb;
                            }
                            if (metadata.memory.heap_min_free_kb !== undefined) {
                                existingData.system.memory.heap_min_free_kb = metadata.memory.heap_min_free_kb;
                            }
                            if (metadata.memory.psram) {
                                existingData.system.memory.psram = { ...existingData.system.memory.psram, ...metadata.memory.psram };
                            }
                        }
                    } else if (topic.endsWith('/system/config')) {
                        // Données statiques système (ip, mac, uptime_start, flash, memory.heap_total_kb) - envoyé une seule fois
                        if (!existingData.system) {
                            existingData.system = {};
                        }
                        existingData.system.ip = metadata.ip;
                        existingData.system.mac = metadata.mac;
                        existingData.system.uptime_start = metadata.uptime_start;
                        existingData.system.flash = metadata.flash;
                        if (metadata.memory) {
                            if (!existingData.system.memory) {
                                existingData.system.memory = {};
                            }
                            if (metadata.memory.heap_total_kb !== undefined) {
                                existingData.system.memory.heap_total_kb = metadata.memory.heap_total_kb;
                            }
                            if (metadata.memory.psram) {
                                existingData.system.memory.psram = metadata.memory.psram;
                            }
                        }
                    } else if (topic.endsWith('/sensors/status')) {
                        // Fusionner les status des capteurs (sans écraser les configs)
                        if (!existingData.sensors) {
                            existingData.sensors = {};
                        }
                        Object.keys(metadata).forEach(sensorName => {
                            if (!existingData.sensors[sensorName]) {
                                existingData.sensors[sensorName] = {};
                            }
                            existingData.sensors[sensorName].status = metadata[sensorName].status;
                            existingData.sensors[sensorName].value = metadata[sensorName].value;
                        });
                    } else if (topic.endsWith('/sensors/config')) {
                        // Stocker la config des capteurs (modèles) dans un objet séparé, comme hardware
                        existingData.sensorsConfig = metadata;
                    } else if (topic.endsWith('/hardware/config')) {
                        // Stocker la config hardware statique (chip, flash totale, etc.) - envoyé une seule fois
                        existingData.hardware = metadata;
                    }
                    
                    // Stocker/écraser les infos hardware pour ce module
                    return pool.query(`
                        INSERT INTO device_status (module_id, status_data, updated_at)
                        VALUES ($1, $2, NOW())
                        ON CONFLICT (module_id) 
                        DO UPDATE SET status_data = $2, updated_at = NOW()
                    `, [moduleId, JSON.stringify(existingData)]);
                })
                .catch(err => {
                    console.error('   ⚠️  Erreur stockage infos hardware:', err.message);
                });
            }
            
            // Enregistrement des métriques système (poids du code) pour l'historique
            // On peut récupérer chip depuis hardware/config ou system (ancien format)
            if (topic.endsWith('/hardware/config') && metadata?.chip) {
                recordSystemMetricsFromStatus(metadata.chip).catch(err => {
                    console.error('   ⚠️  Erreur enregistrement métriques système:', err.message);
                });
            }
            
            // On continue pour émettre via WebSocket, mais on ne stocke pas dans measurements
            return;
        }

        // Pour les valeurs de capteurs, on stocke avec un filtre de 1 minute
        // MAIS on émet toujours via WebSocket pour le temps réel
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

