import fp from 'fastify-plugin';
import { Pool } from 'pg';
import { config } from '../config/env';

declare module 'fastify' {
    interface FastifyInstance {
        db: Pool;
    }
}

export default fp(async (fastify) => {
    const pool = new Pool(config.db);

    try {
        await pool.connect();
        fastify.log.info('✅ Database connected');
    } catch (err) {
        fastify.log.error(err, '❌ Database connection failed');
        throw err;
    }

    fastify.decorate('db', pool);

    fastify.addHook('onClose', async (instance) => {
        await instance.db.end();
        instance.log.info('Database connection closed');
    });
});
