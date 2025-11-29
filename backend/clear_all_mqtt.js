const mqtt = require('mqtt');

const client = mqtt.connect('mqtt://localhost:1883');

client.on('connect', () => {
    console.log('✅ Connecté au broker MQTT');

    // Effacer TOUS les messages retained pour ce module
    const topics = [
        'home/croissance/sensors/config',
        'home/croissance/sensors/status',
        'home/croissance/hardware/config',
        'home/croissance/system/config',
        'home/croissance/system'
    ];

    let count = 0;
    topics.forEach(topic => {
        client.publish(topic, '', { retain: true, qos: 1 }, (err) => {
            if (err) {
                console.error(`❌ Erreur pour ${topic}:`, err);
            } else {
                console.log(`✅ Effacé: ${topic}`);
            }
            count++;
            if (count === topics.length) {
                console.log('\n✅ Tous les messages MQTT retained ont été effacés');
                client.end();
                process.exit(0);
            }
        });
    });
});

client.on('error', (err) => {
    console.error('❌ Erreur connexion MQTT:', err);
    process.exit(1);
});
