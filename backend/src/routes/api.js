const express = require('express');
const router = express.Router();
const { getPool } = require('../db/database');
const { getMetricsHistory } = require('../services/metricsService');
const { publishConfig } = require('../services/mqttService');

// 0. Sauvegarder la configuration d'un module (refresh rates)
router.post('/modules/:id/config', async (req, res) => {
    const moduleId = req.params.id;
    const config = req.body; // { sensors: { co2: { interval: 20 }, ... } }

    if (!moduleId || !config) {
        return res.status(400).json({ error: 'Missing moduleId or config' });
    }

    const pool = getPool();
    if (!pool) return res.status(503).json({ error: 'Database not connected' });

    try {
        // 1. Récupérer les données existantes
        const result = await pool.query(`
            SELECT status_data FROM device_status WHERE module_id = $1
        `, [moduleId]);

        let existingData = {};
        if (result.rows.length > 0 && result.rows[0].status_data) {
            existingData = result.rows[0].status_data;
        }

        // 2. Mettre à jour la config des capteurs (Merge deep ou shallow)
        // IMPORTANT: sensorsConfig peut contenir à la fois:
        // - Les modèles de capteurs (co2: { model: "MH-Z19B" }, etc.)
        // - L'objet sensors avec les intervalles (sensors: { co2: { interval: 60 }, etc. })
        // On doit préserver les deux !

        if (!existingData.sensorsConfig) {
            existingData.sensorsConfig = {};
        }

        // S'assurer que l'objet sensors existe
        if (!existingData.sensorsConfig.sensors) {
            existingData.sensorsConfig.sensors = {};
        }

        // Merge des intervalles dans sensors (sans toucher aux modèles)
        if (config.sensors) {
            Object.keys(config.sensors).forEach(key => {
                existingData.sensorsConfig.sensors[key] = {
                    ...existingData.sensorsConfig.sensors[key],
                    ...config.sensors[key]
                };
            });
        }

        // On publie la config COMPLÈTE fusionnée à l'ESP32
        // L'ESP32 s'attend à recevoir tout ou partie, mais c'est mieux d'envoyer tout ce qu'on a
        const mergedConfig = existingData.sensorsConfig;

        console.log('💾 Saving to DB - existingData.sensorsConfig:', JSON.stringify(existingData.sensorsConfig, null, 2));

        // 3. Sauvegarder en base
        await pool.query(`
            INSERT INTO device_status (module_id, status_data, updated_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (module_id) 
            DO UPDATE SET status_data = $2, updated_at = NOW()
        `, [moduleId, JSON.stringify(existingData)]);

        // 4. Publier via MQTT pour l'ESP32
        // L'ESP32 attend uniquement { sensors: { co2: { interval: X }, ... } }
        // On ne lui envoie PAS les modèles (qui sont au même niveau dans sensorsConfig)
        const configForEsp32 = { sensors: mergedConfig.sensors || {} };
        console.log('📤 Publishing config to ESP32:', JSON.stringify(configForEsp32, null, 2));
        publishConfig(moduleId, configForEsp32);

        res.json({ success: true, config: mergedConfig });
    } catch (err) {
        console.error(`❌ Erreur sauvegarde config module ${moduleId}:`, err);
        res.status(500).json({ error: err.message });
    }
});

// 1. Récupérer la liste des modules (basé sur les topics de capteurs, pas /status)
// Les infos hardware ne sont plus stockées en base, uniquement via WebSocket
router.get('/modules', async (req, res) => {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: 'Database not connected' });
    try {
        // On récupère les modules depuis les topics de capteurs (co2, temperature, etc.)
        // Pas depuis /status car les infos hardware ne sont plus stockées
        const query = `
            SELECT DISTINCT 
                CASE 
                    WHEN topic LIKE '%/co2' THEN regexp_replace(topic, '/co2$', '')
                    WHEN topic LIKE '%/temperature' THEN regexp_replace(topic, '/temperature$', '')
                    WHEN topic LIKE '%/humidity' THEN regexp_replace(topic, '/humidity$', '')
                    ELSE NULL
                END as module_id 
            FROM measurements 
            WHERE topic LIKE '%/co2' OR topic LIKE '%/temperature' OR topic LIKE '%/humidity'
        `;
        const result = await pool.query(query);

        const modules = [];
        const moduleIds = new Set();

        // Extraire les IDs uniques
        result.rows.forEach(row => {
            if (row.module_id) {
                moduleIds.add(row.module_id);
            }
        });

        for (const id of moduleIds) {
            let name = id.split('/').pop();

            // Les infos hardware ne sont plus en base, elles arrivent uniquement via WebSocket
            // On retourne juste l'ID et le nom, le status sera mis à jour par WebSocket
            modules.push({
                id: id,
                name: name,
                type: 'unknown', // Sera mis à jour via WebSocket
                status: null // Sera mis à jour via WebSocket
            });
        }

        modules.sort((a, b) => a.name.localeCompare(b.name));
        console.log(`📦 Modules trouvés: ${modules.length} (infos hardware via WebSocket uniquement)`);
        res.json(modules);
    } catch (err) {
        console.error("Erreur /api/modules:", err);
        res.status(500).json({ error: err.message });
    }
});

// 2. Endpoint agrégé (Reste utile pour l'historique détaillé si on clique sur un module)
router.get('/dashboard', async (req, res) => {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: 'Database not connected' });

    const module = req.query.module;
    const days = parseInt(req.query.days) || 1;
    const limit = parseInt(req.query.limit) || 10000;

    if (!module) return res.status(400).json({ error: 'Missing module parameter' });

    try {
        // Récupérer les infos hardware depuis la table device_status
        const statusQuery = pool.query(`
            SELECT status_data, updated_at
            FROM device_status
            WHERE module_id = $1
        `, [module]);

        let historyQuery;
        // Pour les graphiques > 7 jours, on utilise la vue horaire (déjà lissée)
        if (days > 7) {
            historyQuery = pool.query(
                `SELECT bucket as time, topic, AVG(value) as value 
                 FROM measurements_hourly 
                 WHERE topic LIKE $1 || '/%' 
                 AND bucket > NOW() - ($2 || ' days')::interval
                 GROUP BY bucket, topic
                 ORDER BY bucket DESC`,
                [module, days]
            );
        } else {
            // Pour les graphiques récents, on lisse à la minute avec time_bucket
            // Cela aligne tous les points (12:00, 12:01, 12:02)
            historyQuery = pool.query(
                `SELECT time_bucket('1 minute', time) as time, topic, AVG(value) as value
                 FROM measurements 
                 WHERE topic LIKE $1 || '/%' 
                 AND time > NOW() - ($2 || ' days')::interval
                 AND value IS NOT NULL
                 GROUP BY time, topic
                 ORDER BY time DESC 
                 LIMIT $3`,
                [module, days, limit]
            );
        }

        const [statusRes, historyRes] = await Promise.all([statusQuery, historyQuery]);

        const co2 = [];
        const temp = [];
        const hum = [];

        historyRes.rows.forEach(row => {
            if (row.topic.endsWith('/co2')) co2.push(row);
            else if (row.topic.endsWith('/temperature')) temp.push(row);
            else if (row.topic.endsWith('/humidity')) hum.push(row);
        });

        // Récupérer les infos hardware depuis device_status
        let status = null;
        if (statusRes.rows.length > 0 && statusRes.rows[0].status_data) {
            status = statusRes.rows[0].status_data;
            status._time = statusRes.rows[0].updated_at;
        }

        res.json({
            status: status,
            sensors: { co2, temp, hum }
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Endpoint simplifié pour obtenir uniquement la taille de la base de données
router.get('/db-size', async (req, res) => {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: 'Database not connected' });

    try {
        const dbSizeQuery = await pool.query(`
            SELECT pg_size_pretty(pg_database_size(current_database())) as total_size,
                   pg_database_size(current_database()) as total_size_bytes
        `);

        res.json({
            total_size: dbSizeQuery.rows[0].total_size,
            total_size_bytes: parseInt(dbSizeQuery.rows[0].total_size_bytes)
        });
    } catch (err) {
        console.error("Erreur /api/db-size:", err);
        res.status(500).json({ error: err.message });
    }
});

// 4. Endpoint pour récupérer l'historique des métriques (poids du code et BDD)
router.get('/metrics-history', async (req, res) => {
    const days = parseInt(req.query.days) || 30;

    try {
        const history = await getMetricsHistory(days);
        if (!history) {
            return res.status(503).json({ error: 'Database not connected' });
        }

        res.json({
            history: history,
            count: history.length,
            period_days: days
        });
    } catch (err) {
        console.error("Erreur /api/metrics-history:", err);
        res.status(500).json({ error: err.message });
    }
});

// 5. Endpoint pour obtenir les informations de stockage de la base de données (détaillé)
router.get('/storage', async (req, res) => {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: 'Database not connected' });

    try {
        // Taille totale de la base de données
        const dbSizeQuery = await pool.query(`
            SELECT pg_size_pretty(pg_database_size(current_database())) as total_size,
                   pg_database_size(current_database()) as total_size_bytes
        `);

        // Taille des tables principales
        const tablesSizeQuery = await pool.query(`
            SELECT 
                schemaname,
                tablename,
                pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
                pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes,
                pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
                pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size
            FROM pg_tables
            WHERE schemaname = 'public'
            ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        `);

        // Nombre de lignes dans la table measurements
        const rowCountQuery = await pool.query(`
            SELECT COUNT(*) as total_rows,
                   COUNT(DISTINCT topic) as unique_topics,
                   MIN(time) as oldest_record,
                   MAX(time) as newest_record
            FROM measurements
        `);

        // Statistiques sur les chunks TimescaleDB
        let chunksInfo = null;
        try {
            const chunksQuery = await pool.query(`
                SELECT 
                    COUNT(*) as total_chunks,
                    pg_size_pretty(SUM(pg_total_relation_size(format('%I.%I', schema_name, table_name)))) as chunks_total_size,
                    SUM(pg_total_relation_size(format('%I.%I', schema_name, table_name))) as chunks_total_size_bytes
                FROM timescaledb_information.chunks
                WHERE hypertable_name = 'measurements'
            `);
            if (chunksQuery.rows.length > 0) {
                chunksInfo = chunksQuery.rows[0];
            }
        } catch (e) {
            // TimescaleDB peut ne pas être disponible
            console.warn('TimescaleDB chunks info non disponible:', e.message);
        }

        res.json({
            database: {
                total_size: dbSizeQuery.rows[0].total_size,
                total_size_bytes: parseInt(dbSizeQuery.rows[0].total_size_bytes)
            },
            tables: tablesSizeQuery.rows.map(row => ({
                name: row.tablename,
                total_size: row.size,
                total_size_bytes: parseInt(row.size_bytes),
                table_size: row.table_size,
                indexes_size: row.indexes_size
            })),
            measurements: {
                total_rows: parseInt(rowCountQuery.rows[0].total_rows),
                unique_topics: parseInt(rowCountQuery.rows[0].unique_topics),
                oldest_record: rowCountQuery.rows[0].oldest_record,
                newest_record: rowCountQuery.rows[0].newest_record
            },
            timescaledb: chunksInfo ? {
                total_chunks: parseInt(chunksInfo.total_chunks),
                chunks_total_size: chunksInfo.chunks_total_size,
                chunks_total_size_bytes: parseInt(chunksInfo.chunks_total_size_bytes)
            } : null
        });
    } catch (err) {
        console.error("Erreur /api/storage:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
