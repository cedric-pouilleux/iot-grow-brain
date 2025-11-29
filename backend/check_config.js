const { Pool } = require('pg');

const pool = new Pool({
    host: '127.0.0.1',
    port: 5432,
    user: 'postgres',
    password: 'password',
    database: 'iot_data'
});

async function checkConfig() {
    try {
        const result = await pool.query(`
            SELECT module_id, status_data 
            FROM device_status 
            WHERE module_id LIKE '%croissance%'
        `);

        console.log('=== Config dans la base ===');
        result.rows.forEach(row => {
            console.log(`\nModule: ${row.module_id}`);
            console.log('sensorsConfig:', JSON.stringify(row.status_data?.sensorsConfig, null, 2));
        });

        await pool.end();
    } catch (err) {
        console.error('Erreur:', err);
        process.exit(1);
    }
}

checkConfig();
