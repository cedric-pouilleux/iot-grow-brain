import { z } from 'zod'

export const MetricsHistoryQuerySchema = z.object({
  days: z.string().default('30').transform(Number),
})

export const DbSizeResponseSchema = z.object({
  totalSize: z.string(),
  totalSizeBytes: z.number(),
})

export const MetricsHistoryResponseSchema = z.object({
  history: z.array(
    z.object({
      time: z.string().or(z.date()),
      codeSizeKb: z.number().nullable(),
      dbSizeBytes: z.string().or(z.number()),
    })
  ),
  count: z.number(),
  periodDays: z.number(),
})

export const StorageResponseSchema = z.object({
  database: z.object({
    totalSize: z.string(),
    totalSizeBytes: z.number(),
  }),
  tables: z.array(
    z.object({
      name: z.string(),
      totalSize: z.string(),
      totalSizeBytes: z.number(),
      tableSize: z.string(),
      indexesSize: z.string(),
    })
  ),
  measurements: z.object({
    totalRows: z.number(),
    uniqueTopics: z.number(),
    oldestRecord: z.string().or(z.date()).nullable(),
    newestRecord: z.string().or(z.date()).nullable(),
  }),
  timescaledb: z
    .object({
      totalChunks: z.number(),
      chunksTotalSize: z.string(),
      chunksTotalSizeBytes: z.number(),
    })
    .nullable(),
})
