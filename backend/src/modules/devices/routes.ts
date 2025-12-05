import { FastifyPluginAsync } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { DeviceController } from './controller'
import {
  ModuleConfigSchema,
  ModuleParamsSchema,
  ModuleDataQuerySchema,
  ModuleListResponseSchema,
  ModuleDataResponseSchema,
  ConfigUpdateResponseSchema,
  SensorResetSchema,
} from './schema'

const devicesRoutes: FastifyPluginAsync = async fastify => {
  const app = fastify.withTypeProvider<ZodTypeProvider>()
  const controller = new DeviceController(fastify)

  // GET /modules - List all modules
  app.get(
    '/modules',
    {
      schema: {
        tags: ['Devices'],
        summary: 'List all modules',
        response: {
          200: ModuleListResponseSchema,
        },
      },
    },
    controller.listModules
  )

  // POST /modules/:id/config - Update module configuration
  app.post(
    '/modules/:id/config',
    {
      schema: {
        tags: ['Devices'],
        summary: 'Update module sensor configuration',
        params: ModuleParamsSchema,
        body: ModuleConfigSchema,
        response: {
          200: ConfigUpdateResponseSchema,
        },
      },
    },
    controller.updateConfig
  )

  // POST /modules/:id/reset-sensor - Reset a specific sensor
  app.post(
    '/modules/:id/reset-sensor',
    {
      schema: {
        tags: ['Devices'],
        summary: 'Reset a specific sensor',
        params: ModuleParamsSchema,
        body: SensorResetSchema,
        response: {
          200: ConfigUpdateResponseSchema, // Reusing simple success response
        },
      },
    },
    controller.resetSensor
  )

  // GET /modules/:id/data - Get module status and time series measurements
  app.get(
    '/modules/:id/data',
    {
      schema: {
        tags: ['Devices'],
        summary: 'Get module status and time series measurements',
        params: ModuleParamsSchema,
        querystring: ModuleDataQuerySchema,
        response: {
          200: ModuleDataResponseSchema,
        },
      },
    },
    controller.getModuleData
  )
}

export default devicesRoutes
