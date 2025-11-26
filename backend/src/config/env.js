require('dotenv').config();

module.exports = {
    mqtt: {
        broker: process.env.MQTT_BROKER || 'mqtt://localhost',
    },
    db: {
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || '127.0.0.1',
        password: process.env.DB_PASSWORD || 'password',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'iot_data',
        ssl: false,
        connectionTimeoutMillis: 30000, // 30s pour être très large
        idleTimeoutMillis: 30000,
        keepAlive: true,
        allowExitOnIdle: false
    },
    api: {
        port: process.env.API_PORT || 3001,
    }
};

