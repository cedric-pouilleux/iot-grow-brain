import { FastifyPluginAsync } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import {
  ModuleConfigSchema,
  ModuleParamsSchema,
  ModuleDataQuerySchema,
  ModuleListResponseSchema,
  ModuleDataResponseSchema,
  ConfigUpdateResponseSchema,
} from './schema'
import { DeviceRepository } from './deviceRepository'
import type {
  ModuleListItem,
  ModuleDataResponse,
  DeviceStatus,
  SensorDataPoint,
  ConfigUpdateResponse,
} from '../../types/api'
import type { ModuleConfig } from '../../types/mqtt'

const devicesRoutes: FastifyPluginAsync = async fastify => {
  const app = fastify.withTypeProvider<ZodTypeProvider>()
  const deviceRepo = new DeviceRepository(fastify.db)

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
    async (_req, _res) => {
      try {
        const rows = await deviceRepo.getAllModules()
        const modules: ModuleListItem[] = rows.map(row => {
          const id = row.moduleId
          const name = id.split('/').pop() || id
          return { id, name, type: 'unknown', status: null }
        })
        return modules
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        fastify.log.error(`Error fetching modules: ${errorMessage}`)
        throw fastify.httpErrors.internalServerError('Failed to fetch modules')
      }
    }
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
    async (req, _res) => {
      const { id } = req.params
      const config: ModuleConfig = req.body

      try {
        if (config.sensors) {
          const queries = Object.entries(config.sensors).map(([sensorType, sensorConfig]) => {
            const interval = sensorConfig?.interval
            if (interval !== undefined) {
              return deviceRepo.updateSensorConfig(id, sensorType, interval)
            }
            return Promise.resolve()
          })
          await Promise.all(queries)
        }

        // Publish to MQTT
        const published = fastify.publishConfig(id, config)

        if (published) {
          const response: ConfigUpdateResponse = {
            success: true,
            message: 'Configuration updated and published',
          }
          return response
        } else {
          throw fastify.httpErrors.internalServerError('Failed to publish configuration')
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        fastify.log.error(`Error updating config: ${errorMessage}`)
        throw fastify.httpErrors.internalServerError(errorMessage)
      }
    }
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
    async (req, _res) => {
      const { id } = req.params
      const { days } = req.query
      const limit = days > 7 ? 10000 : 5000

      try {
        const [statusRow, sensorStatusRows, sensorConfigRows, historyRows] = await Promise.all([
          deviceRepo.getDeviceStatus(id),
          deviceRepo.getSensorStatus(id),
          deviceRepo.getSensorConfig(id),
          deviceRepo.getHistoryData(id, days, limit),
        ])

        fastify.log.info(
          `📊 Dashboard query for ${id}: ${historyRows.length} historical records found`
        )

        // Build response
        const status: DeviceStatus = {}

        if (statusRow) {
          status.system = {
            ip: statusRow.ip,
            mac: statusRow.mac,
            uptimeStart: statusRow.uptimeStart,
            rssi: statusRow.rssi,
            flash: {
              usedKb: statusRow.flashUsedKb,
              freeKb: statusRow.flashFreeKb,
              systemKb: statusRow.flashSystemKb,
            },
            memory: {
              heapTotalKb: statusRow.heapTotalKb,
              heapFreeKb: statusRow.heapFreeKb,
              heapMinFreeKb: statusRow.heapMinFreeKb,
            },
          }

          if (statusRow.chipModel) {
            status.hardware = {
              chip: {
                model: statusRow.chipModel,
                rev: statusRow.chipRev,
                cpuFreqMhz: statusRow.cpuFreqMhz,
                flashKb: statusRow.flashKb,
                cores: statusRow.cores,
              },
            }
          }
        }

        // Add sensor status
        status.sensors = {}
        sensorStatusRows.forEach(row => {
          status.sensors![row.sensorType] = {
            status: row.status ?? 'unknown',
            value: row.value,
          }
        })

        // Add sensor config
        status.sensorsConfig = { sensors: {} }
        sensorConfigRows.forEach(row => {
          status.sensorsConfig!.sensors[row.sensorType] = {
            interval: row.intervalSeconds,
            model: row.model,
          }
        })

        // Process historical data
        const co2: SensorDataPoint[] = []
        const temp: SensorDataPoint[] = []
        const hum: SensorDataPoint[] = []
        const voc: SensorDataPoint[] = []

        historyRows.forEach(row => {
          const dataPoint: SensorDataPoint = {
            time: row.time,
            value: row.value,
          }

          if (row.sensorType === 'co2') {
            co2.push(dataPoint)
          } else if (row.sensorType === 'temperature') {
            temp.push(dataPoint)
          } else if (row.sensorType === 'humidity') {
            hum.push(dataPoint)
          } else if (row.sensorType === 'voc') {
            voc.push(dataPoint)
          }
        })

        fastify.log.info(
          `📊 Processed historical data: co2=${co2.length}, temp=${temp.length}, hum=${hum.length}, voc=${voc.length}`
        )

        const response: ModuleDataResponse = {
          status,
          sensors: { co2, temp, hum, voc },
        }
        return response
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        fastify.log.error(`Error fetching dashboard: ${errorMessage}`)
        throw fastify.httpErrors.internalServerError('Failed to fetch dashboard data')
      }
    }
  )
}

export default devicesRoutes
