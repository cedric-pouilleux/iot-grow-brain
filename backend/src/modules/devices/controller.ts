import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { DeviceRepository } from './deviceRepository'
import type {
  ModuleListItem,
  ModuleDataResponse,
  DeviceStatus,
  SensorDataPoint,
  ConfigUpdateResponse,
} from '../../types/api'
import type { ModuleConfig } from '../../types/mqtt'
import { ModuleParamsSchema, ModuleConfigSchema, ModuleDataQuerySchema } from './schema'
import { z } from 'zod'

type ModuleParams = z.infer<typeof ModuleParamsSchema>
type ModuleConfigBody = z.infer<typeof ModuleConfigSchema>
type ModuleDataQuery = z.infer<typeof ModuleDataQuerySchema>

export class DeviceController {
  private deviceRepo: DeviceRepository

  constructor(private fastify: FastifyInstance) {
    this.deviceRepo = new DeviceRepository(fastify.db)
  }

  listModules = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const rows = await this.deviceRepo.getAllModules()
      const modules: ModuleListItem[] = rows.map(row => {
        const id = row.moduleId
        const name = id.split('/').pop() || id
        return { id, name, type: 'unknown', status: null }
      })
      return modules
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      this.fastify.log.error(`Error fetching modules: ${errorMessage}`)
      throw this.fastify.httpErrors.internalServerError('Failed to fetch modules')
    }
  }

  updateConfig = async (
    req: FastifyRequest<{ Params: ModuleParams; Body: ModuleConfigBody }>,
    reply: FastifyReply
  ) => {
    const { id } = req.params
    const config: ModuleConfig = req.body

    try {
      if (config.sensors) {
        const queries = Object.entries(config.sensors).map(([sensorType, sensorConfig]) => {
          const interval = sensorConfig?.interval
          if (interval !== undefined) {
            return this.deviceRepo.updateSensorConfig(id, sensorType, interval)
          }
          return Promise.resolve()
        })
        await Promise.all(queries)
      }

      // Publish to MQTT
      const published = this.fastify.publishConfig(id, config)

      if (published) {
        const response: ConfigUpdateResponse = {
          success: true,
          message: 'Configuration updated and published',
        }
        return response
      } else {
        throw this.fastify.httpErrors.internalServerError('Failed to publish configuration')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      this.fastify.log.error(`Error updating config: ${errorMessage}`)
      throw this.fastify.httpErrors.internalServerError(errorMessage)
    }
  }

  getModuleData = async (
    req: FastifyRequest<{ Params: ModuleParams; Querystring: ModuleDataQuery }>,
    reply: FastifyReply
  ) => {
    const { id } = req.params
    const { days } = req.query
    const limit = days > 7 ? 10000 : 5000

    try {
      const [statusRow, sensorStatusRows, sensorConfigRows, historyRows] = await Promise.all([
        this.deviceRepo.getDeviceStatus(id),
        this.deviceRepo.getSensorStatus(id),
        this.deviceRepo.getSensorConfig(id),
        this.deviceRepo.getHistoryData(id, days, limit),
      ])

      this.fastify.log.info(
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
      // Initialize with empty arrays for known sensors to ensure type safety
      // In a more dynamic system, we might not hardcode these, but the API type requires them
      const sensorsData: Record<string, SensorDataPoint[]> = {
        co2: [],
        temp: [],
        hum: [],
        voc: [],
        pressure: [],
        temperature_bmp: [],
      }

      historyRows.forEach(row => {
        const dataPoint: SensorDataPoint = {
          time: row.time,
          value: row.value,
        }

        // Map database sensor types to API keys if they differ, or use as is
        // Assuming 'temperature' -> 'temp', 'humidity' -> 'hum'
        let key = row.sensorType
        if (key === 'temperature') key = 'temp'
        if (key === 'humidity') key = 'hum'
        
        if (sensorsData[key]) {
            sensorsData[key].push(dataPoint)
        }
      })

      this.fastify.log.info(
        `📊 Processed historical data: co2=${sensorsData.co2.length}, temp=${sensorsData.temp.length}, hum=${sensorsData.hum.length}, voc=${sensorsData.voc.length}, pressure=${sensorsData.pressure.length}, temperature_bmp=${sensorsData.temperature_bmp.length}`
      )

      const response: ModuleDataResponse = {
        status,
        sensors: {
            co2: sensorsData.co2,
            temp: sensorsData.temp,
            hum: sensorsData.hum,
            voc: sensorsData.voc,
            pressure: sensorsData.pressure,
            temperature_bmp: sensorsData.temperature_bmp,
        },
      }
      return response
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      this.fastify.log.error(`Error fetching dashboard: ${errorMessage}`)
      throw this.fastify.httpErrors.internalServerError('Failed to fetch dashboard data')
    }
  }
}
