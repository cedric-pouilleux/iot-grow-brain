require('dotenv').config();

module.exports = {
    mqtt: {
        broker: process.env.MQTT_BROKER || 'mqtt://localhost',
    },
    db: {
        user: process.env.POSTGRES_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost', // Fallback localhost pour dev hors docker
        password: process.env.POSTGRES_PASSWORD || 'password',
        port: parseInt(process.env.DB_PORT) || 5432,
        database: process.env.POSTGRES_DB || 'iot_data',
        ssl: false,
        connectionTimeoutMillis: 10000, 
        idleTimeoutMillis: 30000,
        allowExitOnIdle: false
    },
    api: {
        port: parseInt(process.env.API_PORT) || 3001,
    }
};

