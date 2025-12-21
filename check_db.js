
const { Client } = require('pg');

const client = new Client({
  user: 'user',
  host: 'localhost',
  database: 'iot_db',
  password: 'password',
  port: 5432,
});

async function checkData() {
  await client.connect();
  
  console.log('--- Checking Measurements Hardware IDs ---');
  const res = await client.query('SELECT hardware_id, sensor_type, count(*) FROM measurements GROUP BY hardware_id, sensor_type');
  console.log(res.rows);
  
  await client.end();
}

checkData().catch(e => console.error(e));
