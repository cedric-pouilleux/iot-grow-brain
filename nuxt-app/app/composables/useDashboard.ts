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
    pm1: SensorDataPoint[]
    pm25: SensorDataPoint[]
    pm4: SensorDataPoint[]
    pm10: SensorDataPoint[]
    eco2: SensorDataPoint[]
    tvoc: SensorDataPoint[]
    temp_sht: SensorDataPoint[]
    hum_sht: SensorDataPoint[]
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
      const pm1Data = isSensorDataArray(sensors?.pm1) ? sensors.pm1 : []
      const pm25Data = isSensorDataArray(sensors?.pm25) ? sensors.pm25 : []
      const pm4Data = isSensorDataArray(sensors?.pm4) ? sensors.pm4 : []
      const pm10Data = isSensorDataArray(sensors?.pm10) ? sensors.pm10 : []
      const eco2Data = isSensorDataArray(sensors?.eco2) ? sensors.eco2 : []
      const tvocData = isSensorDataArray(sensors?.tvoc) ? sensors.tvoc : []
      const tempShtData = isSensorDataArray(sensors?.temp_sht) ? sensors.temp_sht : []
      const humShtData = isSensorDataArray(sensors?.hum_sht) ? sensors.hum_sht : []

      return {
        co2: processSensorData(co2Data),
        temp: processSensorData(tempData),
        hum: processSensorData(humData),
        voc: processSensorData(vocData),
        pressure: processSensorData(pressureData),
        temperature_bmp: processSensorData(temperatureBmpData),
        pm1: processSensorData(pm1Data),
        pm25: processSensorData(pm25Data),
        pm4: processSensorData(pm4Data),
        pm10: processSensorData(pm10Data),
        eco2: processSensorData(eco2Data),
        tvoc: processSensorData(tvocData),
        temp_sht: processSensorData(tempShtData),
        hum_sht: processSensorData(humShtData),
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
      pm1: SensorDataPoint[]
      pm25: SensorDataPoint[]
      pm4: SensorDataPoint[]
      pm10: SensorDataPoint[]
      eco2: SensorDataPoint[]
      tvoc: SensorDataPoint[]
      temp_sht: SensorDataPoint[]
      hum_sht: SensorDataPoint[]
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
          pm1: [],
          pm25: [],
          pm4: [],
          pm10: [],
          eco2: [],
          tvoc: [],
          temp_sht: [],
          hum_sht: [],
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
