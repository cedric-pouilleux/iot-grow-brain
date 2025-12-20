import type { DeviceStatus, SensorData, SensorDataPoint } from '../types'
import type { MqttMessage } from '~/types'
import { processSensorData } from '~/utils/data-processing'
import { useMqttMessageHandler } from '~/composables/useMqttMessageHandler'

const MAX_DATA_POINTS = 5000

/**
 * Composable for managing module data (device status and sensor data)
 * Handles MQTT messages and dashboard data loading for multiple modules
 */
export const useModulesData = () => {
  const {
    MQTT_TOPICS,
    SENSOR_TOPICS,
    isStatusTopic,
    mergeSystemData,
    mergeSystemConfig,
    mergeSensorsStatus,
    mergeSensorsConfig,
    mergeHardwareConfig,
  } = useMqttMessageHandler()

  const modulesDeviceStatus = ref<Map<string, DeviceStatus>>(new Map())
  const modulesSensorData = ref<Map<string, SensorData>>(new Map())

  /**
   * Get device status for a specific module
   */
  const getModuleDeviceStatus = (moduleId: string): DeviceStatus | null => {
    return modulesDeviceStatus.value.get(moduleId) || null
  }

  /**
   * Get sensor data for a specific module
   */
  const getModuleSensorData = (moduleId: string): SensorData => {
    return modulesSensorData.value.get(moduleId) || { 
      co2: [], 
      co: [],
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
      hum_sht: []
    }
  }

  /**
   * Initialize module data structures if they don't exist
   */
  const initializeModule = (moduleId: string): void => {
    if (!modulesDeviceStatus.value.has(moduleId)) {
      modulesDeviceStatus.value.set(moduleId, {
        system: {},
        sensors: {},
        hardware: {},
        sensorsConfig: {},
      })
    }
    if (!modulesSensorData.value.has(moduleId)) {
      modulesSensorData.value.set(moduleId, { 
        co2: [], 
        co: [],
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
        hum_sht: []
      })
    }
  }

  /**
   * Handle incoming MQTT message for a module
   */
  const handleModuleMessage = (moduleId: string, message: MqttMessage): void => {
    initializeModule(moduleId)

    const deviceStatus = modulesDeviceStatus.value.get(moduleId)!
    const sensorData = modulesSensorData.value.get(moduleId)!

    // Handle status/config messages
    if (isStatusTopic(message.topic) && message.metadata) {
      if (message.topic.endsWith(MQTT_TOPICS.SYSTEM)) {
        mergeSystemData(deviceStatus, message.metadata as any)
      } else if (message.topic.endsWith(MQTT_TOPICS.SYSTEM_CONFIG)) {
        mergeSystemConfig(deviceStatus, message.metadata as any)
      } else if (message.topic.endsWith(MQTT_TOPICS.SENSORS_STATUS)) {
        mergeSensorsStatus(deviceStatus, message.metadata as any)
      } else if (message.topic.endsWith(MQTT_TOPICS.SENSORS_CONFIG)) {
        mergeSensorsConfig(deviceStatus, message.metadata as any)
      } else if (message.topic.endsWith(MQTT_TOPICS.HARDWARE_CONFIG)) {
        mergeHardwareConfig(deviceStatus, message.metadata as any)
      }

      // Trigger reactivity
      modulesDeviceStatus.value.set(moduleId, { ...deviceStatus })
    }
    // Handle sensor measurement messages
    else if (message.value !== null) {
      const sensorKey = Object.entries(SENSOR_TOPICS).find(([suffix]) =>
        message.topic.endsWith(suffix)
      )?.[1] as keyof SensorData | undefined

      if (sensorKey) {
        const newData: SensorDataPoint = {
          time: new Date(message.time),
          value: message.value,
        }

        sensorData[sensorKey].push(newData)

        // Limit data points
        if (sensorData[sensorKey].length > MAX_DATA_POINTS) {
          sensorData[sensorKey].shift()
        }

        // Trigger reactivity
        modulesSensorData.value.set(moduleId, { ...sensorData })
      }
    }
  }

  /**
   * Merge sensor data without duplicates based on timestamp
   * Priorité aux données temps réel (existing) pour les timestamps proches
   */
  const mergeSensorData = (
    existing: SensorDataPoint[],
    incoming: SensorDataPoint[]
  ): SensorDataPoint[] => {
    const timeMap = new Map<number, SensorDataPoint>()
    const TOLERANCE_MS = 1000 // 1 seconde de tolérance pour considérer deux points comme identiques

    // Add existing data first (priority to recent WebSocket data)
    existing.forEach(point => {
      const timeKey = point.time.getTime()
      // Round to nearest second for grouping (to handle timestamp differences)
      const roundedTime = Math.round(timeKey / TOLERANCE_MS) * TOLERANCE_MS

      // Keep the most recent point for this rounded timestamp
      const existingPoint = timeMap.get(roundedTime)
      if (!existingPoint || point.time.getTime() > existingPoint.time.getTime()) {
        timeMap.set(roundedTime, point)
      }
    })

    // Add incoming historical data (don't overwrite existing if within tolerance)
    incoming.forEach(point => {
      const timeKey = point.time.getTime()
      const roundedTime = Math.round(timeKey / TOLERANCE_MS) * TOLERANCE_MS

      // Only add if no existing point is close (within tolerance)
      if (!timeMap.has(roundedTime)) {
        timeMap.set(roundedTime, point)
      }
    })

    // Convert to array, sort by time, limit size
    return Array.from(timeMap.values())
      .sort((a, b) => a.time.getTime() - b.time.getTime())
      .slice(-MAX_DATA_POINTS)
  }

  /**
   * Load dashboard data for a module (from API)
   */
  const loadModuleDashboard = (
    moduleId: string,
    dashboardData: { status: DeviceStatus | null; sensors: any }
  ): void => {
    initializeModule(moduleId)

    // Merge device status
    if (dashboardData.status) {
      const existingStatus = modulesDeviceStatus.value.get(moduleId)!

      modulesDeviceStatus.value.set(moduleId, {
        ...existingStatus,
        ...dashboardData.status,
        system: { ...existingStatus.system, ...dashboardData.status.system },
        sensors: { ...existingStatus.sensors, ...dashboardData.status.sensors },
        sensorsConfig: { ...existingStatus.sensorsConfig, ...dashboardData.status.sensorsConfig },
        hardware: { ...existingStatus.hardware, ...dashboardData.status.hardware },
      })
    }

    // Merge sensor data
    if (dashboardData.sensors) {
      const existingData = modulesSensorData.value.get(moduleId)!
      const newData = {
        co2: processSensorData(dashboardData.sensors?.co2 || []) as SensorDataPoint[],
        co: processSensorData(dashboardData.sensors?.co || []) as SensorDataPoint[],
        temp: processSensorData(dashboardData.sensors?.temp || []) as SensorDataPoint[],
        hum: processSensorData(dashboardData.sensors?.hum || []) as SensorDataPoint[],
        voc: processSensorData(dashboardData.sensors?.voc || []) as SensorDataPoint[],
        pressure: processSensorData(dashboardData.sensors?.pressure || []) as SensorDataPoint[],
        temperature_bmp: processSensorData(dashboardData.sensors?.temperature_bmp || []) as SensorDataPoint[],
        pm1: processSensorData(dashboardData.sensors?.pm1 || []) as SensorDataPoint[],
        pm25: processSensorData(dashboardData.sensors?.pm25 || []) as SensorDataPoint[],
        pm4: processSensorData(dashboardData.sensors?.pm4 || []) as SensorDataPoint[],
        pm10: processSensorData(dashboardData.sensors?.pm10 || []) as SensorDataPoint[],
        eco2: processSensorData(dashboardData.sensors?.eco2 || []) as SensorDataPoint[],
        tvoc: processSensorData(dashboardData.sensors?.tvoc || []) as SensorDataPoint[],
        temp_sht: processSensorData(dashboardData.sensors?.temp_sht || []) as SensorDataPoint[],
        hum_sht: processSensorData(dashboardData.sensors?.hum_sht || []) as SensorDataPoint[],
      }

      modulesSensorData.value.set(moduleId, {
        co2: mergeSensorData(existingData.co2, newData.co2),
        co: mergeSensorData(existingData.co, newData.co),
        temp: mergeSensorData(existingData.temp, newData.temp),
        hum: mergeSensorData(existingData.hum, newData.hum),
        voc: mergeSensorData(existingData.voc, newData.voc),
        pressure: mergeSensorData(existingData.pressure, newData.pressure),
        temperature_bmp: mergeSensorData(existingData.temperature_bmp, newData.temperature_bmp),
        pm1: mergeSensorData(existingData.pm1, newData.pm1),
        pm25: mergeSensorData(existingData.pm25, newData.pm25),
        pm4: mergeSensorData(existingData.pm4, newData.pm4),
        pm10: mergeSensorData(existingData.pm10, newData.pm10),
        eco2: mergeSensorData(existingData.eco2, newData.eco2),
        tvoc: mergeSensorData(existingData.tvoc, newData.tvoc),
        temp_sht: mergeSensorData(existingData.temp_sht, newData.temp_sht),
        hum_sht: mergeSensorData(existingData.hum_sht, newData.hum_sht),
      })
    }
  }

  /**
   * Update only sensor data for a module (replaces existing data)
   * Used when changing time range without reloading status
   */
  const updateModuleSensorData = (
    moduleId: string,
    sensors: {
      co2: SensorDataPoint[]
      co: SensorDataPoint[]
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
  ): void => {
    initializeModule(moduleId)
    modulesSensorData.value.set(moduleId, { ...sensors })
  }

  return {
    modulesDeviceStatus: readonly(modulesDeviceStatus),
    modulesSensorData: readonly(modulesSensorData),
    getModuleDeviceStatus,
    getModuleSensorData,
    handleModuleMessage,
    loadModuleDashboard,
    updateModuleSensorData,
  }
}
