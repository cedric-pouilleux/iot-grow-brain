const { Pool, Client } = require('pg');
const config = require('../config/env');

let pool = null;

async function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function initTimescale() {
    let connected = false;
        // 1. Connexion système pour créer la DB si nécessaire
    while (!connected) {
        console.log(`🔄 Tentative de connexion BDD (${config.db.host}:${config.db.port})...`);
        const sysClient = new Client({ 
            ...config.db, 
            database: 'postgres',
            connectionTimeoutMillis: 10000 
        });
        try {
            await sysClient.connect();
            console.log("✅ Connexion système établie.");
            const res = await sysClient.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [config.db.database]);
            if (res.rows.length === 0) {
                await sysClient.query(`CREATE DATABASE "${config.db.database}"`);
                console.log(`✅ Base de données '${config.db.database}' créée.`);
            }
            await sysClient.end();
            connected = true;
        } catch (err) {
            console.error(`❌ Echec connexion système BDD: ${err.message}. Nouvelle tentative dans 5s...`);
            await sysClient.end().catch(() => {}); 
            await sleep(5000);
        }
    }

    // 2. Connexion à la DB cible et initialisation du schéma
    const newPool = new Pool(config.db);
    try {
        const client = await newPool.connect();
        console.log(`✅ Connecté à la base '${config.db.database}'.`);
        
        // Création table
        await client.query(`
            CREATE TABLE IF NOT EXISTS measurements (
                time TIMESTAMPTZ NOT NULL,
                topic TEXT NOT NULL,
                value DOUBLE PRECISION NULL,
                metadata JSONB
            );
        `);

        // Setup TimescaleDB
        try {
            await client.query("SELECT create_hypertable('measurements', 'time', if_not_exists => TRUE);");
            console.log("✅ Hypertable active.");

            // Vue Matérialisée
            await client.query(`
                CREATE MATERIALIZED VIEW IF NOT EXISTS measurements_hourly
                WITH (timescaledb.continuous) AS
                SELECT time_bucket('1 hour', time) AS bucket,
                       topic,
                       AVG(value) as value,
                       MIN(value) as min_value,
                       MAX(value) as max_value
                FROM measurements
                GROUP BY bucket, topic
                WITH NO DATA;
            `);

            // Policy Refresh
            try {
                await client.query(`
                    SELECT add_continuous_aggregate_policy('measurements_hourly',
                        start_offset => INTERVAL '3 days',
                        end_offset => INTERVAL '1 hour',
                        schedule_interval => INTERVAL '1 hour');
                `);
            } catch (e) { /* Policy exists */ }

            // Compression
            try {
                await client.query(`
                    ALTER TABLE measurements SET (
                        timescaledb.compress,
                        timescaledb.compress_segmentby = 'topic',
                        timescaledb.compress_orderby = 'time DESC'
                    );
                `);
                await client.query("SELECT add_compression_policy('measurements', INTERVAL '7 days');");
                console.log("✅ Compression active.");
            } catch (e) { /* Already enabled */ }

        } catch (e) {
            console.warn("⚠️  Note TimescaleDB:", e.message);
        }

        client.release();
        pool = newPool;
        console.log("🚀 Système de stockage PRÊT !");
        return pool;
    } catch (err) {
        console.error('❌ Erreur connexion base finale:', err.message);
        throw err;
    }
}

function getPool() {
    return pool;
}

module.exports = { initTimescale, getPool };

