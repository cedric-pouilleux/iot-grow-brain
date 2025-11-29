const http = require('http');

const moduleId = 'home/croissance';
const url = `http://localhost:3000/api/dashboard?module=${moduleId}&days=1`;

http.get(url, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log('Status Data Structure:');
            if (json.status) {
                console.log(JSON.stringify(json.status, null, 2));

                // Verify key fields
                const ip = json.status.system?.ip;
                const model = json.status.hardware?.chip?.model;
                const flash = json.status.system?.flash?.used_kb;

                console.log('--------------------------------');
                console.log(`IP: ${ip} (${typeof ip})`);
                console.log(`Model: ${model} (${typeof model})`);
                console.log(`Flash Used: ${flash} (${typeof flash})`);

                if (ip && model) {
                    console.log('✅ Data appears valid for frontend.');
                } else {
                    console.log('❌ Critical data missing.');
                }
            } else {
                console.log('❌ json.status is null or undefined.');
            }
        } catch (e) {
            console.error(e.message);
        }
    });

}).on('error', (err) => {
    console.log('Error: ' + err.message);
});
