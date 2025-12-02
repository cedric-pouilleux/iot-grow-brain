import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { SystemRepository } from './systemRepository'
import type { DbSizeResponse, MetricsHistoryResponse, StorageResponse } from '../../types/api'
import { MetricsHistoryQuerySchema } from './schema'
import { z } from 'zod'

type MetricsHistoryQuery = z.infer<typeof MetricsHistoryQuerySchema>

export class SystemController {
  private systemRepo: SystemRepository

  constructor(private fastify: FastifyInstance) {
    this.systemRepo = new SystemRepository(fastify.db)
  }

  getDbSize = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const row = await this.systemRepo.getDbSize()
      const response: DbSizeResponse = {
        totalSize: row.total_size,
        totalSizeBytes: parseInt(row.total_size_bytes, 10),
      }
      return response
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      this.fastify.log.error(err)
      throw this.fastify.httpErrors.internalServerError(errorMessage)
    }
  }

  getMetricsHistory = async (
    req: FastifyRequest<{ Querystring: MetricsHistoryQuery }>,
    reply: FastifyReply
  ) => {
    const { days } = req.query

    try {
      const rows = await this.systemRepo.getMetricsHistory(days)

      const history = rows.map(row => ({
        time: row.time instanceof Date ? row.time : new Date(row.time),
        codeSizeKb: row.code_size_kb,
        dbSizeBytes: row.db_size_bytes,
      }))

      const response: MetricsHistoryResponse = {
        history: history,
        count: history.length,
        periodDays: days,
      }
      return response
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      this.fastify.log.error(err)
      throw this.fastify.httpErrors.internalServerError(errorMessage)
    }
  }

  getStorageInfo = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const [dbSizeRow, tablesRows, measurementsStats, chunksInfo] = await Promise.all([
        this.systemRepo.getDbSize(),
        this.systemRepo.getTablesSize(),
        this.systemRepo.getMeasurementsStats(),
        this.systemRepo.getTimescaleChunksStats(),
      ])

      const response: StorageResponse = {
        database: {
          totalSize: dbSizeRow.total_size,
          totalSizeBytes: parseInt(dbSizeRow.total_size_bytes, 10),
        },
        tables: tablesRows.map(row => ({
          name: row.tablename,
          totalSize: row.size,
          totalSizeBytes: parseInt(row.size_bytes, 10),
          tableSize: row.table_size,
          indexesSize: row.indexes_size,
        })),
        measurements: {
          totalRows: parseInt(measurementsStats.total_rows, 10),
          uniqueTopics: parseInt(measurementsStats.unique_topics, 10),
          oldestRecord:
            measurementsStats.oldest_record instanceof Date
              ? measurementsStats.oldest_record
              : measurementsStats.oldest_record
                ? new Date(measurementsStats.oldest_record)
                : null,
          newestRecord:
            measurementsStats.newest_record instanceof Date
              ? measurementsStats.newest_record
              : measurementsStats.newest_record
                ? new Date(measurementsStats.newest_record)
                : null,
        },
        timescaledb: chunksInfo
          ? {
              totalChunks: parseInt(chunksInfo.total_chunks, 10),
              chunksTotalSize: chunksInfo.chunks_total_size,
              chunksTotalSizeBytes: parseInt(chunksInfo.chunks_total_size_bytes, 10),
            }
          : null,
      }
      return response
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      this.fastify.log.error(err)
      throw this.fastify.httpErrors.internalServerError(errorMessage)
    }
  }
}
