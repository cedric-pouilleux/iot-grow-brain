const mqtt = require('mqtt');

const client = mqtt.connect('mqtt://localhost:1883');

client.on('connect', () => {
    console.log('Connected to MQTT broker');

    const topic = 'home/croissance/system/config';
    const message = JSON.stringify({
        ip: "192.168.1.73",
        mac: "44:1D:64:68:D3:10",
        uptime_start: 123456,
        flash: {
            free_kb: 1000,
            used_kb: 2000,
            system_kb: 1000
        },
        memory: {
            heap_total_kb: 320
        }
    });

    client.publish(topic, message, { retain: true }, (err) => {
        if (err) {
            console.error('Publish error:', err);
        } else {
            console.log(`Published to ${topic}`);
        }
        client.end();
    });
});
