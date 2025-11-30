import type { DeviceStatus, SensorData, MqttMessage } from '../types'
import { processSensorData } from '../utils/data-processing'

const TOPIC_SYSTEM = '/system'
const TOPIC_SYSTEM_CONFIG = '/system/config'
const TOPIC_SENSORS_STATUS = '/sensors/status'
const TOPIC_SENSORS_CONFIG = '/sensors/config'
const TOPIC_HARDWARE_CONFIG = '/hardware/config'

const SENSOR_TOPICS = {
  '/co2': 'co2',
  '/temperature': 'temp',
  '/humidity': 'hum'
} as const

const MAX_DATA_POINTS = 100

const isStatusTopic = (topic: string) => 
  topic.endsWith(TOPIC_SYSTEM) ||
  topic.endsWith(TOPIC_SYSTEM_CONFIG) ||
  topic.endsWith(TOPIC_SENSORS_STATUS) ||
  topic.endsWith(TOPIC_SENSORS_CONFIG) ||
  topic.endsWith(TOPIC_HARDWARE_CONFIG)

const mergeSystemData = (status: DeviceStatus, metadata: any) => {
  if (!status.system) status.system = {}
  status.system.rssi = metadata.rssi
  if (metadata.memory) {
    if (!status.system.memory) status.system.memory = {}
    if (metadata.memory.heap_free_kb !== undefined) {
      status.system.memory.heap_free_kb = metadata.memory.heap_free_kb
    }
    if (metadata.memory.heap_min_free_kb !== undefined) {
      status.system.memory.heap_min_free_kb = metadata.memory.heap_min_free_kb
    }
    if (metadata.memory.psram) {
      status.system.memory.psram = { ...status.system.memory.psram, ...metadata.memory.psram }
    }
  }
}

const mergeSystemConfig = (status: DeviceStatus, metadata: any) => {
  if (!status.system) status.system = {}
  status.system.ip = metadata.ip
  status.system.mac = metadata.mac
  status.system.uptime_start = metadata.uptime_start
  status.system.flash = metadata.flash
  status.system._config_received_at = Math.floor(Date.now() / 1000)
  status.system._uptime_start_offset = metadata.uptime_start
  if (metadata.memory) {
    if (!status.system.memory) status.system.memory = {}
    if (metadata.memory.heap_total_kb !== undefined) {
      status.system.memory.heap_total_kb = metadata.memory.heap_total_kb
    }
    if (metadata.memory.psram) {
      status.system.memory.psram = metadata.memory.psram
    }
  }
}

const mergeSensorsStatus = (status: DeviceStatus, metadata: any) => {
  if (!status.sensors) status.sensors = {}
  Object.keys(metadata).forEach(sensorName => {
    if (!status.sensors![sensorName]) {
      status.sensors![sensorName] = {}
    }
    status.sensors![sensorName] = {
      ...status.sensors![sensorName],
      status: metadata[sensorName].status,
      value: metadata[sensorName].value
    }
  })
}

export const useModulesData = () => {
  const modulesDeviceStatus = ref<Map<string, DeviceStatus>>(new Map())
  const modulesSensorData = ref<Map<string, SensorData>>(new Map())

  const getModuleDeviceStatus = (moduleId: string): DeviceStatus | null => {
    return modulesDeviceStatus.value.get(moduleId) || null
  }

  const getModuleSensorData = (moduleId: string): SensorData => {
    return modulesSensorData.value.get(moduleId) || { co2: [], temp: [], hum: [] }
  }

  const handleModuleMessage = (moduleId: string, message: MqttMessage) => {
    // Initialiser les structures si nécessaire
    if (!modulesDeviceStatus.value.has(moduleId)) {
      modulesDeviceStatus.value.set(moduleId, { system: {}, sensors: {}, hardware: {}, sensorsConfig: {} })
    }
    if (!modulesSensorData.value.has(moduleId)) {
      modulesSensorData.value.set(moduleId, { co2: [], temp: [], hum: [] })
    }

    const deviceStatus = modulesDeviceStatus.value.get(moduleId)!
    const sensorData = modulesSensorData.value.get(moduleId)!

    // Traiter les messages de statut
    if (isStatusTopic(message.topic) && message.metadata) {
      if (message.topic.endsWith(TOPIC_SYSTEM)) {
        mergeSystemData(deviceStatus, message.metadata)
      } else if (message.topic.endsWith(TOPIC_SYSTEM_CONFIG)) {
        mergeSystemConfig(deviceStatus, message.metadata)
      } else if (message.topic.endsWith(TOPIC_SENSORS_STATUS)) {
        mergeSensorsStatus(deviceStatus, message.metadata)
      } else if (message.topic.endsWith(TOPIC_SENSORS_CONFIG)) {
        deviceStatus.sensorsConfig = { ...deviceStatus.sensorsConfig, ...message.metadata }
      } else if (message.topic.endsWith(TOPIC_HARDWARE_CONFIG)) {
        deviceStatus.hardware = { ...deviceStatus.hardware, ...message.metadata }
      }
      modulesDeviceStatus.value.set(moduleId, { ...deviceStatus })
    }
    // Traiter les messages de capteurs
    else if (message.value !== null) {
      const sensorKey = Object.entries(SENSOR_TOPICS).find(([suffix]) => 
        message.topic.endsWith(suffix)
      )?.[1] as keyof SensorData | undefined

      if (sensorKey) {
        const newData = { time: new Date(message.time), value: message.value }
        sensorData[sensorKey].push(newData)
        if (sensorData[sensorKey].length > MAX_DATA_POINTS) {
          sensorData[sensorKey].shift()
        }
        modulesSensorData.value.set(moduleId, { ...sensorData })
      }
    }
  }

  const loadModuleDashboard = (moduleId: string, dashboardData: { status: DeviceStatus | null; sensors: any }) => {
    if (dashboardData.status) {
      modulesDeviceStatus.value.set(moduleId, dashboardData.status)
    }
    if (dashboardData.sensors) {
      modulesSensorData.value.set(moduleId, {
        co2: processSensorData(dashboardData.sensors?.co2 || []),
        temp: processSensorData(dashboardData.sensors?.temp || []),
        hum: processSensorData(dashboardData.sensors?.hum || [])
      })
    }
  }

  return {
    modulesDeviceStatus: readonly(modulesDeviceStatus),
    modulesSensorData: readonly(modulesSensorData),
    getModuleDeviceStatus,
    getModuleSensorData,
    handleModuleMessage,
    loadModuleDashboard
  }
}

