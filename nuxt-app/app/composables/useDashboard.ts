import type { DeviceStatus, SensorDataPoint, DashboardSensorData } from '../types'
import { getApiModulesIdData } from '../utils/api'
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
      const response = await getApiModulesIdData(moduleId, { days: days.toString() })
      const dashboardData = response.data

      if (!dashboardData) return null

      const sensors = (dashboardData.sensors as DashboardSensorData) || {}
      const co2Data = isSensorDataArray(sensors?.co2) ? sensors.co2 : []
      const tempData = isSensorDataArray(sensors?.temp) ? sensors.temp : []
      const humData = isSensorDataArray(sensors?.hum) ? sensors.hum : []
      const vocData = isSensorDataArray(sensors?.voc) ? sensors.voc : []
      const pressureData = isSensorDataArray(sensors?.pressure) ? sensors.pressure : []
      const temperatureBmpData = isSensorDataArray(sensors?.temperature_bmp)
        ? sensors.temperature_bmp
        : []

      return {
        status: dashboardData.status as DeviceStatus | null,
        sensors: {
          co2: processSensorData(co2Data),
          temp: processSensorData(tempData),
          hum: processSensorData(humData),
          voc: processSensorData(vocData),
          pressure: processSensorData(pressureData),
          temperature_bmp: processSensorData(temperatureBmpData),
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
  }
}
