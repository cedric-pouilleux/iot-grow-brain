import { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { ModuleConfigSchema, ModuleParamsSchema, DashboardQuerySchema, ModuleListResponseSchema, DashboardResponseSchema, ConfigUpdateResponseSchema } from './schema';

const devicesRoutes: FastifyPluginAsync = async (fastify) => {
    const app = fastify.withTypeProvider<ZodTypeProvider>();

    // GET /modules - List all modules
    app.get('/modules', {
        schema: {
            tags: ['Devices'],
            summary: 'List all modules',
            response: {
                200: ModuleListResponseSchema
            }
        }
    }, async (req, res) => {
        try {
            // Query optimized: use device_system_status for active modules
            const query = `
                SELECT DISTINCT module_id
                FROM device_system_status
                ORDER BY module_id
            `;
            const result = await fastify.db.query(query);

            const modules = result.rows.map(row => {
                const id = row.module_id;
                const name = id.split('/').pop() || id;
                return { id, name, type: 'unknown', status: null };
            });

            return modules;
        } catch (err: any) {
            fastify.log.error(`Error fetching modules: ${err.message}`);
            return res.status(500).send({ error: 'Failed to fetch modules' });
        }
    });

    // POST /modules/:id/config - Update module configuration
    app.post('/modules/:id/config', {
        schema: {
            tags: ['Devices'],
            summary: 'Update module sensor configuration',
            params: ModuleParamsSchema,
            body: ModuleConfigSchema,
            response: {
                200: ConfigUpdateResponseSchema
            }
        }
    }, async (req, res) => {
        const { id } = req.params;
        const config = req.body;

        try {
            // Update sensor_config table
            if (config.sensors) {
                const queries = Object.entries(config.sensors).map(([sensorType, sensorConfig]) => {
                    return fastify.db.query(`
                        INSERT INTO sensor_config (module_id, sensor_type, interval_seconds, updated_at)
                        VALUES ($1, $2, $3, NOW())
                        ON CONFLICT (module_id, sensor_type) 
                        DO UPDATE SET 
                            interval_seconds = EXCLUDED.interval_seconds,
                            updated_at = NOW()
                    `, [id, sensorType, (sensorConfig as any).interval]);
                });

                await Promise.all(queries);
            }

            // Publish to MQTT
            const published = fastify.publishConfig(id, config);

            if (published) {
                return { success: true, message: 'Configuration updated and published' };
            } else {
                return res.status(500).send({ success: false, message: 'Failed to publish configuration' });
            }
        } catch (err: any) {
            fastify.log.error(`Error updating config: ${err.message}`);
            return res.status(500).send({ success: false, message: err.message });
        }
    });

    // GET /dashboard - Get dashboard data for a module
    app.get('/dashboard', {
        schema: {
            tags: ['Devices'],
            summary: 'Get dashboard data for a module',
            querystring: DashboardQuerySchema,
            response: {
                200: DashboardResponseSchema
            }
        }
    }, async (req, res) => {
        const { module, days } = req.query;
        const limit = days > 7 ? 10000 : 5000;

        try {
            // Get device status from normalized tables
            const statusQuery = fastify.db.query(`
                SELECT 
                    s.module_id,
                    s.ip, s.mac, s.uptime_start, s.rssi,
                    s.flash_used_kb, s.flash_free_kb, s.flash_system_kb,
                    s.heap_total_kb, s.heap_free_kb, s.heap_min_free_kb,
                    h.chip_model, h.chip_rev, h.cpu_freq_mhz, h.flash_kb, h.cores
                FROM device_system_status s
                LEFT JOIN device_hardware h ON s.module_id = h.module_id
                WHERE s.module_id = $1
            `, [module]);

            // Get sensor status
            const sensorStatusQuery = fastify.db.query(`
                SELECT sensor_type, status, value
                FROM sensor_status
                WHERE module_id = $1
            `, [module]);

            // Get sensor config
            const sensorConfigQuery = fastify.db.query(`
                SELECT sensor_type, interval_seconds, model
                FROM sensor_config
                WHERE module_id = $1
            `, [module]);

            // Get historical data - use continuous aggregates for > 7 days
            let historyQuery;
            try {
                if (days > 7) {
                    historyQuery = fastify.db.query(`
                        SELECT bucket as time, sensor_type, avg_value as value
                        FROM measurements_hourly
                        WHERE module_id = $1
                          AND bucket > NOW() - ($2 || ' days')::interval
                        ORDER BY bucket DESC
                        LIMIT $3
                    `, [module, days, limit]);
                } else {
                    historyQuery = fastify.db.query(`
                        SELECT time_bucket('1 minute', time) as time, sensor_type, AVG(value) as value
                        FROM measurements
                        WHERE module_id = $1
                          AND time > NOW() - ($2 || ' days')::interval
                        GROUP BY time, sensor_type
                        ORDER BY time DESC
                        LIMIT $3
                    `, [module, days, limit]);
                }
            } catch (queryErr: any) {
                fastify.log.error(`❌ History query error for ${module}: ${queryErr.message}`);
                // Fallback: try without time_bucket if it fails
                historyQuery = fastify.db.query(`
                    SELECT time, sensor_type, value
                    FROM measurements
                    WHERE module_id = $1
                      AND time > NOW() - ($2 || ' days')::interval
                    ORDER BY time DESC
                    LIMIT $3
                `, [module, days, limit]);
            }

            const [statusRes, sensorStatusRes, sensorConfigRes, historyRes] = await Promise.all([
                statusQuery,
                sensorStatusQuery,
                sensorConfigQuery,
                historyQuery
            ]);

            fastify.log.info(`📊 Dashboard query for ${module}: ${historyRes.rows.length} historical records found`);

            // Build response
            const status: any = {};

            if (statusRes.rows.length > 0) {
                const row = statusRes.rows[0];
                status.system = {
                    ip: row.ip,
                    mac: row.mac,
                    uptime_start: row.uptime_start,
                    rssi: row.rssi,
                    flash: {
                        used_kb: row.flash_used_kb,
                        free_kb: row.flash_free_kb,
                        system_kb: row.flash_system_kb
                    },
                    memory: {
                        heap_total_kb: row.heap_total_kb,
                        heap_free_kb: row.heap_free_kb,
                        heap_min_free_kb: row.heap_min_free_kb
                    }
                };

                if (row.chip_model) {
                    status.hardware = {
                        chip: {
                            model: row.chip_model,
                            rev: row.chip_rev,
                            cpu_freq_mhz: row.cpu_freq_mhz,
                            flash_kb: row.flash_kb,
                            cores: row.cores
                        }
                    };
                }
            }

            // Add sensor status
            status.sensors = {};
            sensorStatusRes.rows.forEach(row => {
                status.sensors[row.sensor_type] = {
                    status: row.status,
                    value: row.value
                };
            });

            // Add sensor config
            status.sensorsConfig = { sensors: {} };
            sensorConfigRes.rows.forEach(row => {
                status.sensorsConfig.sensors[row.sensor_type] = {
                    interval: row.interval_seconds,
                    model: row.model
                };
            });

            // Process historical data
            const co2: any[] = [];
            const temp: any[] = [];
            const hum: any[] = [];

            historyRes.rows.forEach(row => {
                const dataPoint = { time: row.time, value: row.value };

                if (row.sensor_type === 'co2') {
                    co2.push(dataPoint);
                } else if (row.sensor_type === 'temperature') {
                    temp.push(dataPoint);
                } else if (row.sensor_type === 'humidity') {
                    hum.push(dataPoint);
                }
            });

            fastify.log.info(`📊 Processed historical data: co2=${co2.length}, temp=${temp.length}, hum=${hum.length}`);

            return {
                status,
                sensors: { co2, temp, hum }
            };
        } catch (err: any) {
            fastify.log.error(`Error fetching dashboard: ${err.message}`);
            return res.status(500).send({ error: 'Failed to fetch dashboard data' });
        }
    });
};

export default devicesRoutes;
