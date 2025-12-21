import type { DeviceStatus, SensorData, SensorDataPoint } from '../types'
import type { MqttMessage } from '~/types'
import { processSensorData } from '~/utils/data-processing'
import { useMqttMessageHandler } from '~/features/mqtt/composables/useMqttMessageHandler'
import { sensorRegistry } from '../utils/SensorRegistry'

const MAX_DATA_POINTS = 5000

/**
 * Composable for managing module data (device status and sensor data)
 * Handles MQTT messages and dashboard data loading for multiple modules
 */
export const useModulesData = () => {
  const {
    MQTT_TOPICS,
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
    return modulesSensorData.value.get(moduleId) || {}
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
      modulesSensorData.value.set(moduleId, {})
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
      const sensorKey = sensorRegistry.matchesTopic(message.topic)
      console.log('[Debug] Topic:', message.topic, 'Matched:', sensorKey, 'Value:', message.value)

      if (sensorKey) {
        const newData: SensorDataPoint = {
          time: new Date(message.time),
          value: message.value,
        }

        if (!sensorData[sensorKey]) {
          sensorData[sensorKey] = []
        }

        // Immutable update for reactivity
        // We create a new array ref
        const newHistory = [...sensorData[sensorKey], newData]
        if (newHistory.length > MAX_DATA_POINTS) {
          newHistory.shift()
        }
        sensorData[sensorKey] = newHistory

        // Trigger reactivity for history
        modulesSensorData.value.set(moduleId, { ...sensorData })

        // ALSO update DeviceStatus value (Real-time Value)
        // This was missing after refactor
        if (!deviceStatus.sensors) deviceStatus.sensors = {}
        if (!deviceStatus.sensors[sensorKey]) deviceStatus.sensors[sensorKey] = { status: 'ok' }
        
        deviceStatus.sensors[sensorKey] = {
          ...deviceStatus.sensors[sensorKey],
          value: message.value,
          status: 'ok'
        }
        
        // Update reactivity for status
        modulesDeviceStatus.value.set(moduleId, { ...deviceStatus })
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
      const newData: SensorData = {}

      // Process each sensor in the dashboard data
      Object.entries(dashboardData.sensors).forEach(([key, values]) => {
        // Validation: verify if it's a known sensor (optional, but good for safety)
        // if (!sensorRegistry.get(key)) return 
        
        // Ensure values is an array
        if (Array.isArray(values)) {
          newData[key] = processSensorData(values) as SensorDataPoint[]
        }
      })

      const mergedData: SensorData = { ...existingData }
      
      Object.entries(newData).forEach(([key, points]) => {
        mergedData[key] = mergeSensorData(existingData[key] || [], points)
      })

      modulesSensorData.value.set(moduleId, mergedData)
    }
  }

  /**
   * Update only sensor data for a module (replaces existing data)
   * Used when changing time range without reloading status
   */
  const updateModuleSensorData = (
    moduleId: string,
    sensors: SensorData
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
