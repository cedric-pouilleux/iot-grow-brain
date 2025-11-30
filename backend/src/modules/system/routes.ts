import { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { sql } from 'drizzle-orm';
import { MetricsHistoryQuerySchema, DbSizeResponseSchema, MetricsHistoryResponseSchema, StorageResponseSchema } from './schema';
import type { DbSizeResponse, MetricsHistoryResponse, StorageResponse } from '../../types/api';

const systemRoutes: FastifyPluginAsync = async (fastify) => {
    const app = fastify.withTypeProvider<ZodTypeProvider>();

    // GET /db-size
    app.get('/db-size', {
        schema: {
            tags: ['System'],
            summary: 'Get database size',
            response: {
                200: DbSizeResponseSchema
            }
        }
    }, async (req, res) => {
        try {
            const dbSizeQuery = await fastify.db.execute<{
                total_size: string;
                total_size_bytes: string;
            }>(sql`
                SELECT pg_size_pretty(pg_database_size(current_database())) as total_size,
                       pg_database_size(current_database()) as total_size_bytes
            `);

            const response: DbSizeResponse = {
                totalSize: dbSizeQuery.rows[0].total_size,
                totalSizeBytes: parseInt(dbSizeQuery.rows[0].total_size_bytes, 10)
            };
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            fastify.log.error(err);
            throw fastify.httpErrors.internalServerError(errorMessage);
        }
    });

    // GET /metrics-history
    app.get('/metrics-history', {
        schema: {
            tags: ['System'],
            summary: 'Get system metrics history',
            querystring: MetricsHistoryQuerySchema,
            response: {
                200: MetricsHistoryResponseSchema
            }
        }
    }, async (req, res) => {
        const { days } = req.query;

        try {
            const result = await fastify.db.execute<{
                time: Date;
                code_size_kb: number | null;
                db_size_bytes: string | number;
            }>(sql`
                SELECT 
                    time,
                    code_size_kb,
                    db_size_bytes
                FROM system_metrics
                WHERE time > NOW() - (${days} || ' days')::interval
                ORDER BY time ASC
            `);

            const history = result.rows.map(row => ({
                time: row.time instanceof Date ? row.time : new Date(row.time),
                codeSizeKb: row.code_size_kb,
                dbSizeBytes: row.db_size_bytes
            }));

            const response: MetricsHistoryResponse = {
                history: history,
                count: history.length,
                periodDays: days
            };
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            fastify.log.error(err);
            throw fastify.httpErrors.internalServerError(errorMessage);
        }
    });

    // GET /storage
    app.get('/storage', {
        schema: {
            tags: ['System'],
            summary: 'Get detailed storage information',
            response: {
                200: StorageResponseSchema
            }
        }
    }, async (req, res) => {
        try {
            // Total DB Size
            const dbSizeQuery = await fastify.db.execute<{
                total_size: string;
                total_size_bytes: string;
            }>(sql`
                SELECT pg_size_pretty(pg_database_size(current_database())) as total_size,
                       pg_database_size(current_database()) as total_size_bytes
            `);

            // Tables Size
            const tablesSizeQuery = await fastify.db.execute<{
                schemaname: string;
                tablename: string;
                size: string;
                size_bytes: string;
                table_size: string;
                indexes_size: string;
            }>(sql`
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
            const rowCountQuery = await fastify.db.execute<{
                total_rows: string;
                unique_topics: string;
                oldest_record: Date | null;
                newest_record: Date | null;
            }>(sql`
                SELECT COUNT(*) as total_rows,
                       COUNT(DISTINCT module_id) as unique_topics,
                       MIN(time) as oldest_record,
                       MAX(time) as newest_record
                FROM measurements
            `);

            // TimescaleDB Chunks
            let chunksInfo: {
                total_chunks: string;
                chunks_total_size: string;
                chunks_total_size_bytes: string;
            } | null = null;
            try {
                const chunksQuery = await fastify.db.execute<{
                    total_chunks: string;
                    chunks_total_size: string;
                    chunks_total_size_bytes: string;
                }>(sql`
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
            } catch (e) {
                const errorMessage = e instanceof Error ? e.message : 'Unknown error';
                fastify.log.warn(`TimescaleDB chunks info not available: ${errorMessage}`);
            }

            const response: StorageResponse = {
                database: {
                    totalSize: dbSizeQuery.rows[0].total_size,
                    totalSizeBytes: parseInt(dbSizeQuery.rows[0].total_size_bytes, 10)
                },
                tables: tablesSizeQuery.rows.map(row => ({
                    name: row.tablename,
                    totalSize: row.size,
                    totalSizeBytes: parseInt(row.size_bytes, 10),
                    tableSize: row.table_size,
                    indexesSize: row.indexes_size
                })),
                measurements: {
                    totalRows: parseInt(rowCountQuery.rows[0].total_rows, 10),
                    uniqueTopics: parseInt(rowCountQuery.rows[0].unique_topics, 10),
                    oldestRecord: rowCountQuery.rows[0].oldest_record instanceof Date 
                        ? rowCountQuery.rows[0].oldest_record 
                        : rowCountQuery.rows[0].oldest_record ? new Date(rowCountQuery.rows[0].oldest_record) : null,
                    newestRecord: rowCountQuery.rows[0].newest_record instanceof Date 
                        ? rowCountQuery.rows[0].newest_record 
                        : rowCountQuery.rows[0].newest_record ? new Date(rowCountQuery.rows[0].newest_record) : null
                },
                timescaledb: chunksInfo ? {
                    totalChunks: parseInt(chunksInfo.total_chunks, 10),
                    chunksTotalSize: chunksInfo.chunks_total_size,
                    chunksTotalSizeBytes: parseInt(chunksInfo.chunks_total_size_bytes, 10)
                } : null
            };
            return response;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            fastify.log.error(err);
            throw fastify.httpErrors.internalServerError(errorMessage);
        }
    });
};

export default systemRoutes;
