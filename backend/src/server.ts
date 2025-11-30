import { buildApp } from './app';
import { config } from './config/env';

async function start() {
    const app = await buildApp();

    try {
        await app.listen({ port: config.api.port, host: '0.0.0.0' });
        console.log(`🚀 Server running at http://localhost:${config.api.port}`);
        console.log(`📚 Documentation at http://localhost:${config.api.port}/documentation`);
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
}

start();
