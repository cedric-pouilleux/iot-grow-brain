const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const config = require('./src/config/env');
const { initTimescale } = require('./src/db/database');
const { initMqtt } = require('./src/services/mqttService');
const apiRoutes = require('./src/routes/api');

// --- Initialisation Express & Socket.io ---
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // En prod avec Nginx, c'est géré par le proxy, mais on laisse ouvert pour dev
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

// --- Routes ---
app.use('/api', apiRoutes);

// --- WebSocket ---
io.on('connection', (socket) => {
    console.log('🔌 Nouveau client WebSocket connecté');
    socket.on('disconnect', () => {
        // console.log('🔌 Client déconnecté');
    });
});

// --- Démarrage Services ---
async function start() {
    try {
        // 1. Base de données
        await initTimescale();

        // 2. MQTT (nécessite l'instance socket.io pour le broadcast)
        initMqtt(io);

        // 3. Serveur HTTP
        server.listen(config.api.port, () => {
            console.log(`🌐 API & WebSocket démarrés sur http://localhost:${config.api.port}`);
        });

    } catch (err) {
        console.error("❌ Erreur critique au démarrage:", err);
        process.exit(1);
    }
}

start();

// --- Graceful Shutdown ---
process.on('SIGINT', async () => {
    console.log('\nArrêt...');
    process.exit(0);
});
