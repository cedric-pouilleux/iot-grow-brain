require('dotenv').config();
const mqtt = require('mqtt');
const { Pool, Client } = require('pg');
const express = require('express');
const cors = require('cors');

// --- Configuration ---
const MQTT_BROKER = process.env.MQTT_BROKER || 'mqtt://localhost';
const MQTT_TOPIC = process.env.MQTT_TOPIC || 'maison/salon/co2';
const API_PORT = process.env.API_PORT || 3001;

const dbConfig = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || '127.0.0.1',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
    connectionTimeoutMillis: 2000, // Timeout court (2s)
    ssl: false
};

const TARGET_DB = process.env.DB_NAME || 'iot_data';

let pool = null; // Le pool sera initialisé plus tard

// --- API Express ---
const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/measurements', async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'Database not connected' });
    
    try {
        const limit = parseInt(req.query.limit) || 10000; // Défaut large si days est utilisé
        const type = req.query.type; // Ex: 'temperature', 'humidity', 'co2'
        const days = parseInt(req.query.days); // Nombre de jours d'historique
        
        let query = 'SELECT * FROM measurements WHERE 1=1'; // 1=1 pour faciliter la concaténation
        let params = [];
        let paramCounter = 0;
        
        // Filtre par type
        if (type) {
            paramCounter++;
            query += ` AND topic LIKE $${paramCounter}`;
            params.push(`%${type}`);
        }

        // Filtre par jours (Prioritaire sur limit si présent)
        if (days && !isNaN(days)) {
            paramCounter++;
            // Postgres syntax: NOW() - INTERVAL '1 days'
            query += ` AND time > NOW() - ($${paramCounter} || ' days')::interval`;
            params.push(days);
        }
        
        // Tri et Limite
        paramCounter++;
        query += ` ORDER BY time DESC LIMIT $${paramCounter}`;
        params.push(limit);

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(API_PORT, () => {
    console.log(`🌐 API démarrée sur http://localhost:${API_PORT}`);
});

// --- Client MQTT (Démarré en premier !) ---
console.log(`Connexion au broker MQTT ${MQTT_BROKER}...`);
const mqttClient = mqtt.connect(MQTT_BROKER);

mqttClient.on('connect', () => {
    console.log('✅ Connecté au broker MQTT !');
    // Abonnement générique à tout ce qui est dans maison/salon/#
    mqttClient.subscribe('maison/salon/#', (err) => {
        if (!err) console.log(`✅ Abonné au topic: maison/salon/#`);
    });
});

mqttClient.on('error', (err) => {
    console.error('❌ Erreur connexion MQTT:', err.message);
});

mqttClient.on('close', () => {
    console.warn('⚠️ Connexion MQTT fermée (reconnexion auto...)');
});

mqttClient.on('offline', () => {
    console.warn('⚠️ Client MQTT hors ligne');
});

mqttClient.on('message', async (topic, message) => {
    const payload = message.toString();
    const value = parseFloat(payload);

    console.log(`📡 Reçu [${topic}]: ${payload}`);

    if (!isNaN(value) && pool) {
        // Sauvegarde uniquement si la DB est connectée
        try {
            await pool.query(
                `INSERT INTO measurements (time, topic, value) VALUES (NOW(), $1, $2)`,
                [topic, value]
            );
            // console.log('-> Sauvegardé en DB');
        } catch (err) {
            console.error('❌ Erreur sauvegarde DB:', err.message);
        }
    } else if (!pool) {
        console.warn('⚠️ Donnée reçue mais DB non connectée (pas de sauvegarde)');
    }
});

// --- Initialisation TimescaleDB (En parallèle) ---
async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function initTimescale() {
    let connected = false;
    
    while (!connected) {
        console.log(`🔄 Tentative de connexion BDD (${dbConfig.host}:${dbConfig.port})...`);
        
        const sysClient = new Client({ ...dbConfig, database: 'postgres' });
        try {
            await sysClient.connect();
            console.log("✅ Connexion système établie.");
            
            const res = await sysClient.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [TARGET_DB]);
            if (res.rows.length === 0) {
                console.log(`Création base '${TARGET_DB}'...`);
                await sysClient.query(`CREATE DATABASE "${TARGET_DB}"`);
            }
            await sysClient.end();
            connected = true;
        } catch (err) {
            console.error(`❌ Echec connexion système BDD: ${err.message}. Nouvelle tentative dans 5s...`);
            await sysClient.end().catch(() => {}); // Cleanup
            await sleep(5000);
        }
    }

    // 2. Connect & Setup Schema
    const newPool = new Pool({ ...dbConfig, database: TARGET_DB });
    try {
        const client = await newPool.connect();
        console.log(`✅ Connecté à la base '${TARGET_DB}'.`);

        await client.query(`
            CREATE TABLE IF NOT EXISTS measurements (
                time TIMESTAMPTZ NOT NULL,
                topic TEXT NOT NULL,
                value DOUBLE PRECISION NULL,
                metadata JSONB
            );
        `);

        // Hypertable check
        try {
            await client.query("SELECT create_hypertable('measurements', 'time', if_not_exists => TRUE);");
            console.log("✅ Hypertable active.");
        } catch (e) {
            // Ignorer si déjà fait ou erreur mineure
        }

        client.release();
        pool = newPool; // On active le pool global
        console.log("🚀 Système de stockage PRÊT !");

    } catch (err) {
        console.error('❌ Erreur connexion base finale:', err.message);
        // Si la connexion finale échoue, on pourrait aussi relancer une boucle, 
        // mais pour l'instant on laisse comme ça, c'est souvent l'étape 1 qui bloque au boot.
    }
}

// Lancement asynchrone de la DB
initTimescale();

// Gestion arrêt
process.on('SIGINT', async () => {
    console.log('\nArrêt...');
    if (pool) await pool.end();
    mqttClient.end();
    process.exit(0);
});
