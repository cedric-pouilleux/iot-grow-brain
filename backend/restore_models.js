const { Pool } = require('pg');

const pool = new Pool({
    host: '127.0.0.1',
    port: 5432,
    user: 'postgres',
    password: 'password',
    database: 'iot_data'
});

async function restoreModels() {
    try {
        // Récupérer la config actuelle
        const result = await pool.query(`
            SELECT status_data 
            FROM device_status 
            WHERE module_id = 'home/croissance'
        `);

        if (result.rows.length === 0) {
            console.log('Module non trouvé');
            await pool.end();
            return;
        }

        const statusData = result.rows[0].status_data;

        // Ajouter les modèles manquants
        if (!statusData.sensorsConfig) {
            statusData.sensorsConfig = {};
        }

        // Restaurer les modèles
        statusData.sensorsConfig.co2 = { model: 'MH-Z19B' };
        statusData.sensorsConfig.voc = { model: 'SGP30' };
        statusData.sensorsConfig.pm25 = { model: 'PMS5003' };
        statusData.sensorsConfig.humidity = { model: 'DHT22' };
        statusData.sensorsConfig.pressure = { model: 'BMP280' };
        statusData.sensorsConfig.temperature = { model: 'DHT22' };

        // Garder les intervalles existants
        if (!statusData.sensorsConfig.sensors) {
            statusData.sensorsConfig.sensors = {};
        }

        console.log('Nouvelle config:', JSON.stringify(statusData.sensorsConfig, null, 2));

        // Sauvegarder
        await pool.query(`
            UPDATE device_status 
            SET status_data = $1, updated_at = NOW()
            WHERE module_id = 'home/croissance'
        `, [JSON.stringify(statusData)]);

        console.log('✅ Modèles restaurés !');

        await pool.end();
    } catch (err) {
        console.error('Erreur:', err);
        process.exit(1);
    }
}

restoreModels();
