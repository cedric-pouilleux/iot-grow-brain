// Script de diagnostic pour vérifier l'état de la base de données
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.POSTGRES_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    password: process.env.POSTGRES_PASSWORD || 'password',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'iot_data',
    ssl: false,
});

async function runDiagnostic() {
    console.log('=== DIAGNOSTIC BASE DE DONNÉES ===\n');

    try {
        // 1. Vérification de la table measurements
        console.log('1. Vérification de la table measurements:');
        const stats = await pool.query(`
            SELECT 
                COUNT(*) as total_rows,
                COUNT(DISTINCT module_id) as unique_modules,
                COUNT(DISTINCT sensor_type) as unique_sensors,
                MIN(time) as oldest_record,
                MAX(time) as newest_record
            FROM measurements
        `);
        console.log(stats.rows[0]);
        console.log('');

        // 2. Dernières mesures insérées
        console.log('2. Dernières mesures insérées (top 10):');
        const recent = await pool.query(`
            SELECT 
                time,
                module_id,
                sensor_type,
                value
            FROM measurements
            ORDER BY time DESC
            LIMIT 10
        `);
        recent.rows.forEach(row => {
            console.log(`  ${row.time.toISOString()} | ${row.module_id} | ${row.sensor_type} | ${row.value}`);
        });
        console.log('');

        // 3. Mesures par module et type de capteur
        console.log('3. Mesures par module et type de capteur:');
        const byModule = await pool.query(`
            SELECT 
                module_id,
                sensor_type,
                COUNT(*) as count,
                MIN(time) as first_measurement,
                MAX(time) as last_measurement
            FROM measurements
            GROUP BY module_id, sensor_type
            ORDER BY module_id, sensor_type
        `);
        byModule.rows.forEach(row => {
            console.log(`  ${row.module_id} | ${row.sensor_type} | ${row.count} mesures | ${row.first_measurement?.toISOString()} -> ${row.last_measurement?.toISOString()}`);
        });
        console.log('');

        // 4. Modules actifs
        console.log('4. Modules actifs dans device_system_status:');
        const modules = await pool.query(`
            SELECT 
                module_id,
                updated_at,
                rssi
            FROM device_system_status
            ORDER BY updated_at DESC
        `);
        modules.rows.forEach(row => {
            console.log(`  ${row.module_id} | RSSI: ${row.rssi} | Updated: ${row.updated_at?.toISOString()}`);
        });
        console.log('');

        // 5. Mesures récentes (5 dernières minutes)
        console.log('5. Vérification des mesures des dernières 5 minutes:');
        const recent5min = await pool.query(`
            SELECT 
                COUNT(*) as recent_measurements,
                COUNT(DISTINCT module_id) as active_modules,
                COUNT(DISTINCT sensor_type) as active_sensors
            FROM measurements
            WHERE time > NOW() - INTERVAL '5 minutes'
        `);
        console.log(recent5min.rows[0]);
        console.log('');

        // 6. Détail des mesures récentes
        if (parseInt(recent5min.rows[0].recent_measurements) > 0) {
            console.log('6. Détail des mesures récentes (5 dernières minutes):');
            const detail = await pool.query(`
                SELECT 
                    time,
                    module_id,
                    sensor_type,
                    value
                FROM measurements
                WHERE time > NOW() - INTERVAL '5 minutes'
                ORDER BY time DESC
                LIMIT 20
            `);
            detail.rows.forEach(row => {
                console.log(`  ${row.time.toISOString()} | ${row.module_id} | ${row.sensor_type} | ${row.value}`);
            });
        } else {
            console.log('⚠️  Aucune mesure dans les 5 dernières minutes!');
        }

    } catch (err) {
        console.error('❌ Erreur lors du diagnostic:', err.message);
        console.error(err);
    } finally {
        await pool.end();
        console.log('\n=== FIN DU DIAGNOSTIC ===');
    }
}

runDiagnostic();

