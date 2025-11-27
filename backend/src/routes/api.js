const express = require('express');
const router = express.Router();
const { getPool } = require('../db/database');

// 1. Récupérer la liste des modules AVEC leur dernier état
router.get('/modules', async (req, res) => {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: 'Database not connected' });
    try {
        const query = `
            SELECT DISTINCT regexp_replace(topic, '/status$', '') as module_id 
            FROM measurements 
            WHERE topic LIKE '%/status'
        `;
        const result = await pool.query(query);
        
        const modules = [];
        
        for (const row of result.rows) {
            const id = row.module_id;
            const statusRes = await pool.query(
                `SELECT metadata, time FROM measurements WHERE topic = $1 ORDER BY time DESC LIMIT 1`,
                [`${id}/status`]
            );
            
            let type = 'unknown';
            let name = id.split('/').pop();
            let status = null;

            if (statusRes.rows.length > 0) {
                status = statusRes.rows[0].metadata;
                status._lastSeen = statusRes.rows[0].time; // Ajout timestamp
                if (status && status.type) type = status.type;
            }

            modules.push({
                id: id,
                name: name,
                type: type,
                status: status // <-- On renvoie tout l'état !
            });
        }

        modules.sort((a, b) => a.name.localeCompare(b.name));
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
        // ... (Reste inchangé pour l'instant) ...
        const statusQuery = pool.query(
            `SELECT metadata, time FROM measurements WHERE topic = $1 ORDER BY time DESC LIMIT 1`,
            [`${module}/status`]
        );

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

        res.json({
            status: statusRes.rows[0] ? { ...statusRes.rows[0].metadata, _time: statusRes.rows[0].time } : null,
            sensors: { co2, temp, hum }
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
