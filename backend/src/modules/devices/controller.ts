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
import { ModuleParamsSchema, ModuleConfigSchema, ModuleDataQuerySchema, SensorResetSchema, ModuleHistoryQuerySchema } from './schema'
import { z } from 'zod'

type ModuleParams = z.infer<typeof ModuleParamsSchema>
type ModuleConfigBody = z.infer<typeof ModuleConfigSchema>
type ModuleDataQuery = z.infer<typeof ModuleDataQuerySchema>
type ModuleHistoryQuery = z.infer<typeof ModuleHistoryQuerySchema>
type SensorResetBody = z.infer<typeof SensorResetSchema>

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

  resetSensor = async (
    req: FastifyRequest<{ Params: ModuleParams; Body: SensorResetBody }>,
    reply: FastifyReply
  ) => {
    const { id } = req.params
    const { sensor } = req.body

    try {
      const published = this.fastify.publishReset(id, sensor)

      if (published) {
        return {
          success: true,
          message: `Reset command sent for sensor ${sensor}`,
        }
      } else {
        throw this.fastify.httpErrors.internalServerError('Failed to publish reset command')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      this.fastify.log.error(`Error resetting sensor: ${errorMessage}`)
      throw this.fastify.httpErrors.internalServerError(errorMessage)
    }
  }

  updatePreferences = async (
    req: FastifyRequest<{ Params: ModuleParams; Body: Record<string, any> }>,
    reply: FastifyReply
  ) => {
    const { id } = req.params
    const preferences = req.body

    try {
      await this.deviceRepo.updatePreferences(id, preferences)
      
      // Return the updated preferences (we could fetch again to return the full set)
      return {
        success: true,
        message: 'Preferences updated',
        preferences: preferences,
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      this.fastify.log.error(`Error updating preferences: ${errorMessage}`)
      throw this.fastify.httpErrors.internalServerError(errorMessage)
    }
  }

  removeFromZone = async (
    req: FastifyRequest<{ Params: ModuleParams }>,
    reply: FastifyReply
  ) => {
    const { id } = req.params

    try {
      await this.deviceRepo.removeFromZone(id)
      this.fastify.log.info(`[ZONES] Device "${id}" retir\u00e9 de sa zone`)
      return {
        success: true,
        message: 'Device removed from zone',
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      this.fastify.log.error(`Error removing from zone: ${errorMessage}`)
      throw this.fastify.httpErrors.internalServerError(errorMessage)
    }
  }

  // GET /modules/:id/status - Status only
  getModuleStatus = async (
    req: FastifyRequest<{ Params: ModuleParams }>,
    reply: FastifyReply
  ) => {
    const { id } = req.params
    try {
      return await this.buildStatus(id)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      this.fastify.log.error(`Error fetching status: ${errorMessage}`)
      throw this.fastify.httpErrors.internalServerError('Failed to fetch status')
    }
  }

  // GET /modules/:id/history - Historical sensor data only
  getModuleHistory = async (
    req: FastifyRequest<{ Params: ModuleParams; Querystring: ModuleHistoryQuery }>,
    reply: FastifyReply
  ) => {
    const { id } = req.params
    const { days } = req.query
    try {
      return await this.buildHistory(id, days)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      this.fastify.log.error(`Error fetching history: ${errorMessage}`)
      throw this.fastify.httpErrors.internalServerError('Failed to fetch history')
    }
  }

  // Legacy endpoint - GET /modules/:id/data
  getModuleData = async (
    req: FastifyRequest<{ Params: ModuleParams; Querystring: ModuleDataQuery }>,
    reply: FastifyReply
  ) => {
    const { id } = req.params
    const { days } = req.query
    try {
      const [status, sensors] = await Promise.all([
        this.buildStatus(id),
        this.buildHistory(id, days),
      ])
      return { status, sensors } as ModuleDataResponse
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      this.fastify.log.error(`Error fetching dashboard: ${errorMessage}`)
      throw this.fastify.httpErrors.internalServerError('Failed to fetch dashboard data')
    }
  }

  // --- Private helpers ---

  private async buildStatus(moduleId: string): Promise<DeviceStatus> {
    const [statusRow, sensorStatusRows, sensorConfigRows] = await Promise.all([
      this.deviceRepo.getDeviceStatus(moduleId),
      this.deviceRepo.getSensorStatus(moduleId),
      this.deviceRepo.getSensorConfig(moduleId),
    ])

    const status: DeviceStatus = {}
    
    // DEBUG: Log zone info
    console.log('[DEBUG] statusRow zones:', { zoneId: statusRow?.zoneId, zoneName: statusRow?.zoneName })

    if (statusRow) {
      status.system = {
        ip: statusRow.ip,
        mac: statusRow.mac,
        bootedAt: statusRow.bootedAt?.toISOString() ?? null,
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
        status.preferences = statusRow.preferences || {}
      }
      
      // Add zone name if device is assigned to a zone
      if (statusRow.zoneName) {
        status.zoneName = statusRow.zoneName
      }
    }

    status.sensors = {}
    sensorStatusRows.forEach(row => {
      status.sensors![row.sensorType] = {
        status: row.status ?? 'unknown',
        value: row.value,
      }
    })

    status.sensorsConfig = { sensors: {} }
    sensorConfigRows.forEach(row => {
      status.sensorsConfig!.sensors[row.sensorType] = {
        interval: row.intervalSeconds,
        model: row.model,
      }
    })

    return status
  }

  private async buildHistory(moduleId: string, days: number) {
    const historyRows = await this.deviceRepo.getHistoryData(moduleId, days)

    this.fastify.log.info(
      `📊 History query for ${moduleId} (days=${days}): ${historyRows.length} records`
    )

    const sensors = {
      co2: [] as SensorDataPoint[],
      temp: [] as SensorDataPoint[],
      hum: [] as SensorDataPoint[],
      voc: [] as SensorDataPoint[],
      pressure: [] as SensorDataPoint[],
      temperature_bmp: [] as SensorDataPoint[],
      pm1: [] as SensorDataPoint[],
      pm25: [] as SensorDataPoint[],
      pm4: [] as SensorDataPoint[],
      pm10: [] as SensorDataPoint[],
      eco2: [] as SensorDataPoint[],
      tvoc: [] as SensorDataPoint[],
      temp_sht: [] as SensorDataPoint[],
      hum_sht: [] as SensorDataPoint[],
    }

    historyRows.forEach(row => {
      const dataPoint: SensorDataPoint = { time: row.time, value: row.value }
      switch (row.sensorType) {
        case 'co2': sensors.co2.push(dataPoint); break
        case 'temperature': sensors.temp.push(dataPoint); break
        case 'humidity': sensors.hum.push(dataPoint); break
        case 'voc': sensors.voc.push(dataPoint); break
        case 'pressure': sensors.pressure.push(dataPoint); break
        case 'temperature_bmp': sensors.temperature_bmp.push(dataPoint); break
        case 'pm1': sensors.pm1.push(dataPoint); break
        case 'pm25': sensors.pm25.push(dataPoint); break
        case 'pm4': sensors.pm4.push(dataPoint); break
        case 'pm10': sensors.pm10.push(dataPoint); break
        case 'eco2': sensors.eco2.push(dataPoint); break
        case 'tvoc': sensors.tvoc.push(dataPoint); break
        case 'temp_sht': sensors.temp_sht.push(dataPoint); break
        case 'hum_sht': sensors.hum_sht.push(dataPoint); break
      }
    })

    this.fastify.log.info({
      msg: 'History counts check',
      moduleId,
      days,
      co2: sensors.co2.length,
      eco2: sensors.eco2.length,
      tvoc: sensors.tvoc.length,
    })

    return sensors
  }
}
