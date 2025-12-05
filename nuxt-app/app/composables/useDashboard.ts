import type { DeviceStatus, SensorDataPoint, DashboardSensorData } from '../types'
import { getApiModulesIdStatus, getApiModulesIdHistory } from '../utils/api'
import { processSensorData } from '../utils/data-processing'

interface RawSensorDataPoint {
  time: string | Date
  value: number
}

const isSensorDataArray = (data: unknown): data is RawSensorDataPoint[] => {
  return Array.isArray(data)
}

export const useDashboard = () => {
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Load only the module status (system, hardware, sensors config)
   * Used for initial page load
   */
  const loadStatus = async (moduleId: string): Promise<DeviceStatus | null> => {
    if (!moduleId) return null

    try {
      const response = await getApiModulesIdStatus(moduleId)
      return response.data as DeviceStatus
    } catch (e) {
      console.error('Erreur fetch status:', e)
      return null
    }
  }

  /**
   * Load only the historical sensor data
   * Used for time range changes - does NOT set global loading state
   */
  const loadHistory = async (
    moduleId: string,
    days: number = 1
  ): Promise<{
    co2: SensorDataPoint[]
    temp: SensorDataPoint[]
    hum: SensorDataPoint[]
    voc: SensorDataPoint[]
    pressure: SensorDataPoint[]
    temperature_bmp: SensorDataPoint[]
  } | null> => {
    if (!moduleId) return null

    try {
      const response = await getApiModulesIdHistory(moduleId, { days: days.toString() })
      const sensors = (response.data as DashboardSensorData) || {}

      const co2Data = isSensorDataArray(sensors?.co2) ? sensors.co2 : []
      const tempData = isSensorDataArray(sensors?.temp) ? sensors.temp : []
      const humData = isSensorDataArray(sensors?.hum) ? sensors.hum : []
      const vocData = isSensorDataArray(sensors?.voc) ? sensors.voc : []
      const pressureData = isSensorDataArray(sensors?.pressure) ? sensors.pressure : []
      const temperatureBmpData = isSensorDataArray(sensors?.temperature_bmp)
        ? sensors.temperature_bmp
        : []

      return {
        co2: processSensorData(co2Data),
        temp: processSensorData(tempData),
        hum: processSensorData(humData),
        voc: processSensorData(vocData),
        pressure: processSensorData(pressureData),
        temperature_bmp: processSensorData(temperatureBmpData),
      }
    } catch (e) {
      console.error('Erreur fetch history:', e)
      return null
    }
  }

  /**
   * Load both status and history (for initial load)
   */
  const loadDashboard = async (
    moduleId: string,
    days: number = 1
  ): Promise<{
    status: DeviceStatus | null
    sensors: {
      co2: SensorDataPoint[]
      temp: SensorDataPoint[]
      hum: SensorDataPoint[]
      voc: SensorDataPoint[]
      pressure: SensorDataPoint[]
      temperature_bmp: SensorDataPoint[]
    }
  } | null> => {
    if (!moduleId) return null

    isLoading.value = true
    error.value = null

    try {
      const [status, sensors] = await Promise.all([
        loadStatus(moduleId),
        loadHistory(moduleId, days),
      ])

      return {
        status,
        sensors: sensors || {
          co2: [],
          temp: [],
          hum: [],
          voc: [],
          pressure: [],
          temperature_bmp: [],
        },
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Erreur inconnue'
      error.value = `Erreur lors du chargement: ${errorMessage}`
      console.error('Erreur fetch dashboard:', e)
      return null
    } finally {
      isLoading.value = false
    }
  }

  return {
    isLoading: readonly(isLoading),
    error: readonly(error),
    loadDashboard,
    loadStatus,
    loadHistory,
  }
}
