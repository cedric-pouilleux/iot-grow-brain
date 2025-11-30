import { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { MetricsHistoryQuerySchema } from './schema';

const systemRoutes: FastifyPluginAsync = async (fastify) => {
    const app = fastify.withTypeProvider<ZodTypeProvider>();

    // GET /db-size
    app.get('/db-size', {
        schema: {
            tags: ['System'],
            summary: 'Get database size',
        }
    }, async (req, res) => {
        try {
            const dbSizeQuery = await fastify.db.query(`
          SELECT pg_size_pretty(pg_database_size(current_database())) as total_size,
                 pg_database_size(current_database()) as total_size_bytes
      `);

            return {
                total_size: dbSizeQuery.rows[0].total_size,
                total_size_bytes: parseInt(dbSizeQuery.rows[0].total_size_bytes)
            };
        } catch (err: any) {
            fastify.log.error(err);
            throw fastify.httpErrors.internalServerError(err.message);
        }
    });

    // GET /metrics-history
    app.get('/metrics-history', {
        schema: {
            tags: ['System'],
            summary: 'Get system metrics history',
            querystring: MetricsHistoryQuerySchema
        }
    }, async (req, res) => {
        const { days } = req.query;

        try {
            const result = await fastify.db.query(`
          SELECT 
              time,
              code_size_kb,
              db_size_bytes
          FROM system_metrics
          WHERE time > NOW() - ($1 || ' days')::interval
          ORDER BY time ASC
      `, [days]);

            const history = result.rows.map(row => ({
                time: row.time,
                code_size_kb: row.code_size_kb,
                db_size_bytes: row.db_size_bytes
            }));

            return {
                history: history,
                count: history.length,
                period_days: days
            };
        } catch (err: any) {
            fastify.log.error(err);
            throw fastify.httpErrors.internalServerError(err.message);
        }
    });

    // GET /storage
    app.get('/storage', {
        schema: {
            tags: ['System'],
            summary: 'Get detailed storage information',
        }
    }, async (req, res) => {
        try {
            // Total DB Size
            const dbSizeQuery = await fastify.db.query(`
          SELECT pg_size_pretty(pg_database_size(current_database())) as total_size,
                 pg_database_size(current_database()) as total_size_bytes
      `);

            // Tables Size
            const tablesSizeQuery = await fastify.db.query(`
          SELECT 
              schemaname,
              tablename,
              pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
              pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes,
              pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
              pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size
          FROM pg_tables
          WHERE schemaname = 'public'
          ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      `);

            // Row Count
            const rowCountQuery = await fastify.db.query(`
          SELECT COUNT(*) as total_rows,
                 COUNT(DISTINCT topic) as unique_topics,
                 MIN(time) as oldest_record,
                 MAX(time) as newest_record
          FROM measurements
      `);

            // TimescaleDB Chunks
            let chunksInfo = null;
            try {
                const chunksQuery = await fastify.db.query(`
              SELECT 
                  COUNT(*) as total_chunks,
                  pg_size_pretty(SUM(pg_total_relation_size(format('%I.%I', schema_name, table_name)))) as chunks_total_size,
                  SUM(pg_total_relation_size(format('%I.%I', schema_name, table_name))) as chunks_total_size_bytes
              FROM timescaledb_information.chunks
              WHERE hypertable_name = 'measurements'
          `);
                if (chunksQuery.rows.length > 0) {
                    chunksInfo = chunksQuery.rows[0];
                }
            } catch (e: any) {
                fastify.log.warn(`TimescaleDB chunks info not available: ${e.message}`);
            }

            return {
                database: {
                    total_size: dbSizeQuery.rows[0].total_size,
                    total_size_bytes: parseInt(dbSizeQuery.rows[0].total_size_bytes)
                },
                tables: tablesSizeQuery.rows.map(row => ({
                    name: row.tablename,
                    total_size: row.size,
                    total_size_bytes: parseInt(row.size_bytes),
                    table_size: row.table_size,
                    indexes_size: row.indexes_size
                })),
                measurements: {
                    total_rows: parseInt(rowCountQuery.rows[0].total_rows),
                    unique_topics: parseInt(rowCountQuery.rows[0].unique_topics),
                    oldest_record: rowCountQuery.rows[0].oldest_record,
                    newest_record: rowCountQuery.rows[0].newest_record
                },
                timescaledb: chunksInfo ? {
                    total_chunks: parseInt(chunksInfo.total_chunks),
                    chunks_total_size: chunksInfo.chunks_total_size,
                    chunks_total_size_bytes: parseInt(chunksInfo.chunks_total_size_bytes)
                } : null
            };
        } catch (err: any) {
            fastify.log.error(err);
            throw fastify.httpErrors.internalServerError(err.message);
        }
    });
};

export default systemRoutes;
