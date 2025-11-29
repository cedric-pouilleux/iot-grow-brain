const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'iot_data',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
});

async function checkDeviceStatus() {
    try {
        const res = await pool.query('SELECT * FROM device_status');
        console.log('Device Status Table Content:');
        if (res.rows.length === 0) {
            console.log('Table is empty.');
        } else {
            res.rows.forEach(row => {
                console.log(`Module: ${row.module_id}`);
                console.log(`Updated At: ${row.updated_at}`);
                console.log(`Data: ${JSON.stringify(row.status_data, null, 2)}`);
                console.log('-------------------');
            });
        }
    } catch (err) {
        console.error('Error querying database:', err);
    } finally {
        await pool.end();
    }
}

checkDeviceStatus();
