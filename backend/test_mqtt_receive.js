const mqtt = require('mqtt');

const BROKER = process.env.MQTT_BROKER || 'mqtt://localhost:1883';

console.log(`🔌 Connexion au broker MQTT ${BROKER}...`);
const client = mqtt.connect(BROKER, {
    reconnectPeriod: 1000,
    connectTimeout: 30000,
    keepalive: 60
});

client.on('connect', () => {
    console.log('✅ Connecté au broker MQTT !');
    console.log(`   Client ID: ${client.options.clientId || 'auto'}`);
    
    // S'abonner à tous les topics
    client.subscribe('#', { qos: 0 }, (err, granted) => {
        if (err) {
            console.error('❌ Erreur lors de l\'abonnement:', err.message);
            process.exit(1);
        } else {
            console.log(`✅ Abonné à tous les topics (#)`);
            if (granted) {
                granted.forEach(g => {
                    console.log(`   Topic: ${g.topic}, QoS: ${g.qos}`);
                });
            }
        }
    });
    
    // Test de publication
    setTimeout(() => {
        const testTopic = 'backend/test/connection';
        client.publish(testTopic, 'Backend test message', { qos: 0 }, (err) => {
            if (err) {
                console.error(`❌ Erreur publication test:`, err.message);
            } else {
                console.log(`✅ Message de test publié sur ${testTopic}`);
            }
        });
    }, 1000);
});

client.on('error', (err) => {
    console.error('❌ Erreur MQTT:', err.message);
    console.error('   Détails:', err);
});

client.on('close', () => {
    console.warn('⚠️  Connexion MQTT fermée');
});

client.on('reconnect', () => {
    console.log('🔄 Reconnexion au broker MQTT...');
});

client.on('offline', () => {
    console.warn('⚠️  Client MQTT hors ligne');
});

client.on('message', (topic, message) => {
    const payload = message.toString();
    
    // Ignorer les messages de test du backend lui-même
    if (topic.startsWith('backend/test/')) {
        return;
    }
    
    console.log(`\n📩 Message reçu sur ${topic} (${message.length} bytes):`);
    
    // Essayer de parser en JSON
    try {
        const json = JSON.parse(payload);
        console.log('   📋 JSON:', JSON.stringify(json, null, 2));
    } catch (e) {
        // Si ce n'est pas du JSON, afficher le texte brut
        if (payload.length > 100) {
            console.log(`   📝 Texte brut (tronqué): ${payload.substring(0, 100)}...`);
        } else {
            console.log(`   📝 Texte brut: ${payload}`);
        }
    }
});

// Compter les messages reçus
let messageCount = 0;
const messageTypes = {
    system: 0,
    sensors: 0,
    co2: 0,
    temperature: 0,
    humidity: 0,
    other: 0
};

client.on('message', (topic, message) => {
    messageCount++;
    const payload = message.toString();
    
    // Catégoriser les messages
    if (topic.includes('/system')) {
        messageTypes.system++;
    } else if (topic.includes('/sensors/')) {
        messageTypes.sensors++;
    } else if (topic.endsWith('/co2')) {
        messageTypes.co2++;
    } else if (topic.endsWith('/temperature')) {
        messageTypes.temperature++;
    } else if (topic.endsWith('/humidity')) {
        messageTypes.humidity++;
    } else {
        messageTypes.other++;
    }
    
    // Ignorer les messages de test du backend lui-même
    if (topic.startsWith('backend/test/')) {
        return;
    }
    
    console.log(`\n📩 Message #${messageCount} reçu sur ${topic} (${message.length} bytes):`);
    
    // Essayer de parser en JSON
    try {
        const json = JSON.parse(payload);
        console.log('   📋 JSON:', JSON.stringify(json, null, 2));
    } catch (e) {
        // Si ce n'est pas du JSON, afficher le texte brut
        if (payload.length > 100) {
            console.log(`   📝 Texte brut (tronqué): ${payload.substring(0, 100)}...`);
        } else {
            console.log(`   📝 Texte brut: ${payload}`);
        }
    }
});

// Timeout de sécurité avec statistiques
setTimeout(() => {
    console.log('\n⏱️  Test terminé après 30 secondes');
    console.log('\n📊 Statistiques des messages reçus:');
    console.log(`   Total: ${messageCount}`);
    console.log(`   System: ${messageTypes.system}`);
    console.log(`   Sensors: ${messageTypes.sensors}`);
    console.log(`   CO2: ${messageTypes.co2}`);
    console.log(`   Temperature: ${messageTypes.temperature}`);
    console.log(`   Humidity: ${messageTypes.humidity}`);
    console.log(`   Autres: ${messageTypes.other}`);
    
    if (messageTypes.co2 === 0 && messageTypes.temperature === 0 && messageTypes.humidity === 0) {
        console.log('\n⚠️  ATTENTION: Aucun message de capteur reçu !');
        console.log('   Vérifiez que l\'ESP32 publie bien les messages de capteurs.');
    }
    
    client.end();
    process.exit(0);
}, 30000);

