import { FastifyPluginAsync } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { desc, and, gte, lte, like, or, eq } from 'drizzle-orm'
import { systemLogs } from '../../db/schema'

const LogsQuerySchema = z.object({
  category: z.enum(['ESP32', 'MQTT', 'DB', 'API', 'SYSTEM']).optional(),
  level: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).optional(),
  search: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(1000)).default('100'),
  offset: z.string().transform(Number).pipe(z.number().int().min(0)).default('0'),
})

const LogEntrySchema = z.object({
  id: z.string(),
  category: z.string(),
  level: z.string(),
  msg: z.string(),
  time: z.date(),
  details: z.record(z.unknown()).nullable(),
})

const LogsResponseSchema = z.object({
  logs: z.array(LogEntrySchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
})

const logsRoutes: FastifyPluginAsync = async fastify => {
  const app = fastify.withTypeProvider<ZodTypeProvider>()

  app.get(
    '/logs',
    {
      schema: {
        tags: ['System'],
        summary: 'Get system logs with filtering',
        querystring: LogsQuerySchema,
        response: {
          200: LogsResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { category, level, search, startDate, endDate, limit, offset } = request.query

      // Build conditions
      const conditions = []
      if (category) {
        conditions.push(eq(systemLogs.category, category))
      }
      if (level) {
        conditions.push(eq(systemLogs.level, level))
      }
      if (search) {
        conditions.push(
          or(like(systemLogs.msg, `%${search}%`), like(systemLogs.level, `%${search}%`))
        )
      }
      if (startDate) {
        conditions.push(gte(systemLogs.time, new Date(startDate)))
      }
      if (endDate) {
        conditions.push(lte(systemLogs.time, new Date(endDate)))
      }

      // Get logs
      const logsResult = await fastify.db
        .select()
        .from(systemLogs)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(systemLogs.time))
        .limit(limit)
        .offset(offset)

      // Cast details to proper type
      const logs = logsResult.map(log => ({
        ...log,
        details: log.details as Record<string, unknown> | null,
      }))

      // Get total count
      const totalResult = await fastify.db
        .select({ count: systemLogs.id })
        .from(systemLogs)
        .where(conditions.length > 0 ? and(...conditions) : undefined)

      return {
        logs,
        total: totalResult.length,
        limit,
        offset,
      }
    }
  )

  app.delete(
    '/logs',
    {
      schema: {
        tags: ['System'],
        summary: 'Delete all system logs',
        response: {
          200: z.object({
            deleted: z.number(),
            message: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const deleted = await fastify.db.delete(systemLogs)

      fastify.log.info({
        msg: '[SYSTEM] All logs deleted',
        deletedCount: deleted.rowCount || 0,
      })

      return {
        deleted: deleted.rowCount || 0,
        message: `Successfully deleted ${deleted.rowCount || 0} logs`,
      }
    }
  )
}

export default logsRoutes
