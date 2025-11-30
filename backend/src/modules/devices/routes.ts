import { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { ModuleConfigSchema, ModuleParamsSchema, DashboardQuerySchema } from './schema';

const devicesRoutes: FastifyPluginAsync = async (fastify) => {
    const app = fastify.withTypeProvider<ZodTypeProvider>();

    // GET /modules
    app.get('/modules', {
        schema: {
            tags: ['Devices'],
            summary: 'List all modules',
        }
    }, async (req, res) => {
        try {
            const query = `
        SELECT DISTINCT 
            CASE 
                WHEN topic LIKE '%/co2' THEN regexp_replace(topic, '/co2$', '')
                WHEN topic LIKE '%/temperature' THEN regexp_replace(topic, '/temperature$', '')
                WHEN topic LIKE '%/humidity' THEN regexp_replace(topic, '/humidity$', '')
                ELSE NULL
            END as module_id 
        FROM measurements 
        WHERE topic LIKE '%/co2' OR topic LIKE '%/temperature' OR topic LIKE '%/humidity'
      `;
            const result = await fastify.db.query(query);

            const modulesByName = new Map();
            const moduleIds = new Set();

            result.rows.forEach(row => {
                if (row.module_id) moduleIds.add(row.module_id);
            });

            for (const id of moduleIds) {
                let name = (id as string).split('/').pop() || id;
                const existing = modulesByName.get(name);

                if (!existing) {
                    modulesByName.set(name, { id, name, type: 'unknown', status: null });
                } else if (id === name && existing.id !== name) {
                    modulesByName.set(name, { id, name, type: 'unknown', status: null });
                }
            }

            const modules = Array.from(modulesByName.values()).sort((a, b) => a.name.localeCompare(b.name));
            return modules;
        } catch (err: any) {
            fastify.log.error(err);
            throw fastify.httpErrors.internalServerError(err.message);
        }
    });

    // POST /modules/:id/config
    app.post('/modules/:id/config', {
        schema: {
            tags: ['Devices'],
            summary: 'Update module configuration',
            params: ModuleParamsSchema,
            body: ModuleConfigSchema
        }
    }, async (req, res) => {
        const { id } = req.params;
        const config = req.body;

        try {
            const result = await fastify.db.query('SELECT status_data FROM device_status WHERE module_id = $1', [id]);
            let existingData: any = {};
            if (result.rows.length > 0 && result.rows[0].status_data) {
                existingData = result.rows[0].status_data;
            }

            if (!existingData.sensorsConfig) existingData.sensorsConfig = {};
            if (!existingData.sensorsConfig.sensors) existingData.sensorsConfig.sensors = {};

            if (config.sensors) {
                Object.keys(config.sensors).forEach(key => {
                    // @ts-ignore
                    existingData.sensorsConfig.sensors[key] = {
                        ...existingData.sensorsConfig.sensors[key],
                        ...config.sensors![key]
                    };
                });
            }

            await fastify.db.query(`
          INSERT INTO device_status (module_id, status_data, updated_at)
          VALUES ($1, $2, NOW())
          ON CONFLICT (module_id) 
          DO UPDATE SET status_data = $2, updated_at = NOW()
      `, [id, JSON.stringify(existingData)]);

            const configForEsp32 = { sensors: existingData.sensorsConfig.sensors || {} };
            fastify.publishConfig(id, configForEsp32);

            return { success: true, config: existingData.sensorsConfig };
        } catch (err: any) {
            fastify.log.error(err);
            throw fastify.httpErrors.internalServerError(err.message);
        }
    });

    // GET /dashboard
    app.get('/dashboard', {
        schema: {
            tags: ['Devices'],
            summary: 'Get dashboard data',
            querystring: DashboardQuerySchema
        }
    }, async (req, res) => {
        const { module, days, limit } = req.query;

        try {
            const statusQuery = fastify.db.query(`
          SELECT status_data, updated_at
          FROM device_status
          WHERE module_id = $1
      `, [module]);

            let historyQuery;
            if (days > 7) {
                historyQuery = fastify.db.query(
                    `SELECT bucket as time, topic, AVG(value) as value 
               FROM measurements_hourly 
               WHERE topic LIKE $1 || '/%' 
               AND bucket > NOW() - ($2 || ' days')::interval
               GROUP BY bucket, topic
               ORDER BY bucket DESC`,
                    [module, days]
                );
            } else {
                historyQuery = fastify.db.query(
                    `SELECT time_bucket('1 minute', time) as time, topic, AVG(value) as value
               FROM measurements 
               WHERE topic LIKE $1 || '/%' 
               AND time > NOW() - ($2 || ' days')::interval
               AND value IS NOT NULL
               GROUP BY time, topic
               ORDER BY time DESC 
               LIMIT $3`,
                    [module, days, limit]
                );
            }

            const [statusRes, historyRes] = await Promise.all([statusQuery, historyQuery]);

            const co2: any[] = [];
            const temp: any[] = [];
            const hum: any[] = [];

            historyRes.rows.forEach(row => {
                if (row.topic.endsWith('/co2')) co2.push(row);
                else if (row.topic.endsWith('/temperature')) temp.push(row);
                else if (row.topic.endsWith('/humidity')) hum.push(row);
            });

            let status: any = null;
            if (statusRes.rows.length > 0 && statusRes.rows[0].status_data) {
                status = statusRes.rows[0].status_data;
                status._time = statusRes.rows[0].updated_at;
            }

            return {
                status: status,
                sensors: { co2, temp, hum }
            };
        } catch (err: any) {
            fastify.log.error(err);
            throw fastify.httpErrors.internalServerError(err.message);
        }
    });
};

export default devicesRoutes;
