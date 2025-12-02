import { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { sql } from 'drizzle-orm'
import * as schema from '../../db/schema'

export class SystemRepository {
  constructor(private db: NodePgDatabase<typeof schema>) {}

  async getDbSize() {
    const result = await this.db.execute<{
      total_size: string
      total_size_bytes: string
    }>(sql`
            SELECT pg_size_pretty(pg_database_size(current_database())) as total_size,
                   pg_database_size(current_database()) as total_size_bytes
        `)
    return result.rows[0]
  }

  async getMetricsHistory(days: number) {
    const result = await this.db.execute<{
      time: Date
      code_size_kb: number | null
      db_size_bytes: string | number
    }>(sql`
            SELECT 
                time,
                code_size_kb,
                db_size_bytes
            FROM system_metrics
            WHERE time > NOW() - (${days} || ' days')::interval
            ORDER BY time ASC
        `)
    return result.rows
  }

  async getTablesSize() {
    const result = await this.db.execute<{
      schemaname: string
      tablename: string
      size: string
      size_bytes: string
      table_size: string
      indexes_size: string
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
        `)
    return result.rows
  }

  async getMeasurementsStats() {
    const result = await this.db.execute<{
      total_rows: string
      unique_topics: string
      oldest_record: Date | null
      newest_record: Date | null
    }>(sql`
            SELECT COUNT(*) as total_rows,
                   COUNT(DISTINCT module_id) as unique_topics,
                   MIN(time) as oldest_record,
                   MAX(time) as newest_record
            FROM measurements
        `)
    return result.rows[0]
  }

  async getTimescaleChunksStats() {
    try {
      const result = await this.db.execute<{
        total_chunks: string
        chunks_total_size: string
        chunks_total_size_bytes: string
      }>(sql`
                SELECT 
                    COUNT(*) as total_chunks,
                    pg_size_pretty(SUM(pg_total_relation_size(format('%I.%I', schema_name, table_name)))) as chunks_total_size,
                    SUM(pg_total_relation_size(format('%I.%I', schema_name, table_name))) as chunks_total_size_bytes
                FROM timescaledb_information.chunks
                WHERE hypertable_name = 'measurements'
            `)
      return result.rows.length > 0 ? result.rows[0] : null
    } catch (e) {
      return null
    }
  }
}
