import fp from 'fastify-plugin';
import { Pool } from 'pg';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { config } from '../config/env';

declare module 'fastify' {
    interface FastifyInstance {
        db: NodePgDatabase<typeof schema>;
        pg: Pool;
    }
}

export default fp(async (fastify) => {
    const pool = new Pool(config.db);
    const db = drizzle(pool, { schema });

    try {
        await pool.connect();
        fastify.log.info('✅ Database connected');
    } catch (err) {
        fastify.log.error(err, '❌ Database connection failed');
        throw err;
    }

    fastify.decorate('db', db);
    fastify.decorate('pg', pool);

    fastify.addHook('onClose', async (instance) => {
        await instance.pg.end();
        instance.log.info('Database connection closed');
    });
});
