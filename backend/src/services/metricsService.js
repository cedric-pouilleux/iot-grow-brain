const { getPool } = require('../db/database');

// Cache pour éviter d'enregistrer trop souvent (max 1 fois par heure)
let lastMetricsRecordTime = 0;
const METRICS_RECORD_INTERVAL = 3600000; // 1 heure

// Enregistre les métriques système depuis un message /status (appelé depuis MQTT)
async function recordSystemMetricsFromStatus(chipData) {
    const pool = getPool();
    if (!pool) {
        return; // Pas de log, appelé de manière asynchrone
    }

    // Vérifier qu'on n'enregistre pas trop souvent
    const now = Date.now();
    if (now - lastMetricsRecordTime < METRICS_RECORD_INTERVAL) {
        return; // Trop tôt, on ignore
    }

    try {
        const codeSizeKb = chipData?.flash_used_kb ? parseInt(chipData.flash_used_kb) : null;
        
        if (codeSizeKb === null) {
            return; // Pas de données de code disponibles
        }

        // Récupérer la taille de la base de données
        const dbSizeQuery = await pool.query(`
            SELECT pg_database_size(current_database()) as total_size_bytes
        `);
        const dbSizeBytes = parseInt(dbSizeQuery.rows[0].total_size_bytes);

        // Enregistrer les métriques
        await pool.query(`
            INSERT INTO system_metrics (time, code_size_kb, db_size_bytes)
            VALUES (NOW(), $1, $2)
        `, [codeSizeKb, dbSizeBytes]);

        lastMetricsRecordTime = now;
        console.log(`📊 Métriques enregistrées: Code=${codeSizeKb}KB, BDD=${(dbSizeBytes / 1024 / 1024).toFixed(2)}MB`);

    } catch (err) {
        // Log silencieux pour ne pas polluer les logs MQTT
        console.error('❌ Erreur enregistrement métriques système:', err.message);
    }
}

// Enregistre les métriques système (poids du code et de la BDD) - appelé périodiquement
async function recordSystemMetrics() {
    const pool = getPool();
    if (!pool) {
        console.warn('⚠️  Pool DB non disponible, métriques non enregistrées');
        return;
    }

    try {
        // 1. Récupérer la taille de la base de données
        const dbSizeQuery = await pool.query(`
            SELECT pg_database_size(current_database()) as total_size_bytes
        `);
        const dbSizeBytes = parseInt(dbSizeQuery.rows[0].total_size_bytes);

        // 2. Pour la taille du code, on ne peut pas la récupérer ici car les messages /status
        // ne sont plus stockés en base. On s'appuie sur recordSystemMetricsFromStatus
        // qui est appelé directement depuis MQTT quand un message /status arrive.
        // Ici, on enregistre juste la taille de la BDD si on n'a pas de données de code récentes.
        
        // Vérifier s'il y a une entrée récente avec code_size_kb
        const recentMetricsQuery = await pool.query(`
            SELECT code_size_kb
            FROM system_metrics
            WHERE code_size_kb IS NOT NULL
            AND time > NOW() - INTERVAL '2 hours'
            ORDER BY time DESC
            LIMIT 1
        `);

        let codeSizeKb = null;
        if (recentMetricsQuery.rows.length > 0) {
            codeSizeKb = recentMetricsQuery.rows[0].code_size_kb;
        }

        // 3. Enregistrer les métriques (au moins la taille de la BDD)
        await pool.query(`
            INSERT INTO system_metrics (time, code_size_kb, db_size_bytes)
            VALUES (NOW(), $1, $2)
        `, [codeSizeKb, dbSizeBytes]);

        console.log(`📊 Métriques enregistrées: Code=${codeSizeKb ? codeSizeKb + 'KB' : 'N/A'}, BDD=${(dbSizeBytes / 1024 / 1024).toFixed(2)}MB`);

    } catch (err) {
        console.error('❌ Erreur enregistrement métriques:', err.message);
    }
}

// Récupérer l'historique des métriques
async function getMetricsHistory(days = 30) {
    const pool = getPool();
    if (!pool) return null;

    try {
        const result = await pool.query(`
            SELECT 
                time,
                code_size_kb,
                db_size_bytes
            FROM system_metrics
            WHERE time > NOW() - ($1 || ' days')::interval
            ORDER BY time ASC
        `, [days]);

        return result.rows.map(row => ({
            time: row.time,
            code_size_kb: row.code_size_kb,
            db_size_bytes: row.db_size_bytes
        }));
    } catch (err) {
        console.error('❌ Erreur récupération historique métriques:', err.message);
        return null;
    }
}

module.exports = { recordSystemMetrics, recordSystemMetricsFromStatus, getMetricsHistory };

