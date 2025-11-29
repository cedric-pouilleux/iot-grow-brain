const mqtt = require('mqtt');
const config = require('../config/env');
const { getPool } = require('../db/database');
const { recordSystemMetricsFromStatus } = require('./metricsService');

let mqttClient = null;
let ioInstance = null;

// --- OPTIMIZATION STORAGE ---
// --- OPTIMIZATION STORAGE ---
// Le throttling est maintenant géré par l'ESP32 via la configuration

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
            return `($${i + 1}, $${i + 2}, $${i + 3}, $${i + 4})`;
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
    console.log(`🔌 Connexion au broker MQTT ${config.mqtt.broker}...`);
    
    const mqttOptions = {
        reconnectPeriod: 1000,
        connectTimeout: 30000,
        keepalive: 60
    };
    
    mqttClient = mqtt.connect(config.mqtt.broker, mqttOptions);

    mqttClient.on('connect', () => {
        console.log('✅ Connecté au broker MQTT !');
        console.log(`   Client ID: ${mqttClient.options.clientId || 'auto'}`);
        
        // S'abonner à tous les topics
        mqttClient.subscribe('#', { qos: 0 }, (err, granted) => {
            if (err) {
                console.error('❌ Erreur lors de l\'abonnement:', err.message);
            } else {
                console.log(`✅ Abonné à tous les topics (#)`);
                if (granted) {
                    granted.forEach(g => {
                        console.log(`   Topic: ${g.topic}, QoS: ${g.qos}`);
                    });
                }
            }
        });
        
        // Test de publication pour vérifier la connexion
        setTimeout(() => {
            const testTopic = 'backend/test/connection';
            mqttClient.publish(testTopic, 'Backend connected', { qos: 0 }, (err) => {
                if (err) {
                    console.error(`❌ Erreur publication test sur ${testTopic}:`, err.message);
                } else {
                    console.log(`✅ Message de test publié sur ${testTopic}`);
                }
            });
        }, 1000);
    });

    mqttClient.on('error', (err) => {
        console.error('❌ Erreur connexion MQTT:', err.message);
        console.error('   Détails:', err);
    });

    mqttClient.on('close', () => {
        console.warn('⚠️  Connexion MQTT fermée');
    });

    mqttClient.on('reconnect', () => {
        console.log('🔄 Reconnexion au broker MQTT...');
    });

    mqttClient.on('offline', () => {
        console.warn('⚠️  Client MQTT hors ligne');
    });

    mqttClient.on('message', async (topic, message) => {
        const payload = message.toString();
        
        // Ignorer les messages de test du backend lui-même
        if (topic.startsWith('backend/test/')) {
            return;
        }
        
        // Log tous les messages, surtout ceux qui pourraient être des capteurs
        const isSensorTopic = topic.endsWith('/co2') || topic.endsWith('/temperature') || topic.endsWith('/humidity');
        if (isSensorTopic) {
            console.log(`📩 Message CAPTEUR reçu sur ${topic} (${message.length} bytes): "${payload}"`);
        } else {
            console.log(`📩 Message reçu sur ${topic} (${message.length} bytes)`);
        }
        
        let value = null;
        let metadata = null;

        // Parsing
        try {
            if (topic.endsWith('/system') || topic.endsWith('/system/config') || topic.endsWith('/sensors/status') || topic.endsWith('/sensors/config') || topic.endsWith('/hardware/config')) {
                metadata = JSON.parse(payload);
            } else {
                // Messages de capteurs (co2, temperature, humidity)
                value = parseFloat(payload);
                if (isNaN(value)) {
                    console.log(`   ⚠️  Valeur non numérique ignorée sur ${topic}: "${payload}" (type: ${typeof payload})`);
                    return;
                }
                console.log(`   ✅ Valeur capteur parsée: ${value} (topic: ${topic})`);
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
            if (value !== null) {
                console.log(`   📤 Émis via WebSocket: ${topic} = ${value}`);
            } else if (metadata) {
                console.log(`   📤 Émis via WebSocket (metadata): ${topic}`);
            }
        } else {
            console.warn(`   ⚠️  ioInstance non disponible, message non émis via WebSocket`);
        }

        // 2. Stockage des infos hardware dans la table device_status (écrasée à chaque fois)
        if ((topic.endsWith('/system') || topic.endsWith('/system/config') || topic.endsWith('/sensors/status') || topic.endsWith('/sensors/config') || topic.endsWith('/hardware/config')) && metadata) {
            let moduleId = topic;
            if (topic.endsWith('/system/config')) moduleId = topic.slice(0, -'/system/config'.length);
            else if (topic.endsWith('/system')) moduleId = topic.slice(0, -'/system'.length);
            else if (topic.endsWith('/sensors/status')) moduleId = topic.slice(0, -'/sensors/status'.length);
            else if (topic.endsWith('/sensors/config')) moduleId = topic.slice(0, -'/sensors/config'.length);
            else if (topic.endsWith('/hardware/config')) moduleId = topic.slice(0, -'/hardware/config'.length);
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

        // Pour les valeurs de capteurs, on stocke sans filtre temporel côté backend
        // C'est l'ESP32 qui gère la fréquence d'envoi selon la config
        if (value !== null) {
            messageBuffer.push({ topic, value, metadata });
            console.log(`   💾 Ajouté au buffer: ${topic} = ${value} (buffer: ${messageBuffer.length}/${BATCH_SIZE})`);

            // Si le buffer est plein, on vide tout de suite
            if (messageBuffer.length >= BATCH_SIZE) {
                console.log(`   📦 Buffer plein (${BATCH_SIZE}), vidage...`);
                flushBuffer();
            }
        } else {
            console.log(`   ⚠️  Message ignoré (value est null): topic=${topic}, metadata=${metadata ? 'présente' : 'absente'}`);
        }
    });

    return mqttClient;
}

function publishConfig(moduleId, config) {
    if (!mqttClient) {
        console.error('❌ MQTT Client non initialisé, impossible de publier la config');
        return false;
    }
    const topic = `${moduleId}/sensors/config`;
    const payload = JSON.stringify(config);

    // retain: true pour que l'ESP récupère la config au démarrage
    mqttClient.publish(topic, payload, { retain: true, qos: 1 }, (err) => {
        if (err) console.error(`❌ Erreur publication config sur ${topic}:`, err);
        else console.log(`📤 Config publiée sur ${topic}:`, config);
    });
    return true;
}

module.exports = { initMqtt, publishConfig };

