const mqtt = require('mqtt');

const BROKER = 'mqtt://growbrain.local:1883';
const TOPIC = 'home/croissance/sensors/config';

const testConfig = {
    sensors: {
        co2: {
            interval: 10
        },
        temperature: {
            interval: 70
        },
        humidity: {
            interval: 300
        }
    }
};

console.log('🔌 Connexion au broker MQTT...');
const client = mqtt.connect(BROKER);

client.on('connect', () => {
    console.log('✅ Connecté au broker MQTT');
    
    // S'abonner pour écouter les messages de l'ESP32
    client.subscribe('home/croissance/#', (err) => {
        if (err) {
            console.error('❌ Erreur abonnement:', err);
            return;
        }
        console.log('✅ Abonné à home/croissance/# pour écouter l\'ESP32');
    });
    
    // Attendre 2 secondes pour que l'ESP32 soit prêt
    setTimeout(() => {
        console.log('\n📤 Publication du message de test...');
        console.log('📋 Payload:', JSON.stringify(testConfig, null, 2));
        
        client.publish(
            TOPIC,
            JSON.stringify(testConfig),
            { retain: true, qos: 1 },
            (err) => {
                if (err) {
                    console.error('❌ Erreur publication:', err);
                } else {
                    console.log('✅ Message publié avec succès (retain=true, qos=1)');
                }
            }
        );
        
        // Publier un deuxième message après 3 secondes pour tester
        setTimeout(() => {
            const testConfig2 = {
                sensors: {
                    co2: { interval: 15 },
                    temperature: { interval: 80 },
                    humidity: { interval: 200 }
                }
            };
            
            console.log('\n📤 Publication d\'un deuxième message de test...');
            console.log('📋 Payload:', JSON.stringify(testConfig2, null, 2));
            
            client.publish(
                TOPIC,
                JSON.stringify(testConfig2),
                { retain: true, qos: 1 },
                (err) => {
                    if (err) {
                        console.error('❌ Erreur publication:', err);
                    } else {
                        console.log('✅ Deuxième message publié avec succès');
                    }
                }
            );
            
            // Fermer la connexion après 2 secondes
            setTimeout(() => {
                console.log('\n👋 Fermeture de la connexion...');
                client.end();
                process.exit(0);
            }, 2000);
        }, 3000);
    }, 2000);
});

client.on('message', (topic, message) => {
    const payload = message.toString();
    console.log(`\n📩 Message reçu de l'ESP32 sur ${topic}:`);
    
    try {
        const json = JSON.parse(payload);
        console.log('   📋 JSON:', JSON.stringify(json, null, 2));
    } catch (e) {
        console.log(`   📝 Texte brut: ${payload}`);
    }
});

client.on('error', (err) => {
    console.error('❌ Erreur MQTT:', err);
    process.exit(1);
});

// Timeout de sécurité
setTimeout(() => {
    console.log('\n⏱️ Timeout atteint, fermeture...');
    client.end();
    process.exit(0);
}, 10000);

