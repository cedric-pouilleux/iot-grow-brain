const mqtt = require('mqtt');

const client = mqtt.connect('mqtt://localhost:1883');

client.on('connect', () => {
    console.log('✅ Connecté au broker MQTT');

    // Publier un message vide avec retain=true pour effacer le message retained
    client.publish('home/croissance/sensors/config', '', { retain: true, qos: 1 }, (err) => {
        if (err) {
            console.error('❌ Erreur:', err);
        } else {
            console.log('✅ Message retained effacé pour home/croissance/sensors/config');
        }

        client.end();
        process.exit(0);
    });
});

client.on('error', (err) => {
    console.error('❌ Erreur connexion MQTT:', err);
    process.exit(1);
});
