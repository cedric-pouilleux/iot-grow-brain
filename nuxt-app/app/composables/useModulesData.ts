import type { DeviceStatus, SensorData, SensorDataPoint, MqttMessage } from '../types'
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
    if (metadata.memory.heapFreeKb !== undefined) {
      status.system.memory.heapFreeKb = metadata.memory.heapFreeKb
    }
    if (metadata.memory.heapMinFreeKb !== undefined) {
      status.system.memory.heapMinFreeKb = metadata.memory.heapMinFreeKb
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
  status.system.uptimeStart = metadata.uptimeStart
  status.system.flash = metadata.flash
  status.system._configReceivedAt = Math.floor(Date.now() / 1000)
  status.system._uptimeStartOffset = metadata.uptimeStart
  if (metadata.memory) {
    if (!status.system.memory) status.system.memory = {}
    if (metadata.memory.heapTotalKb !== undefined) {
      status.system.memory.heapTotalKb = metadata.memory.heapTotalKb
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
    // Fusionner le statut au lieu de le remplacer
    if (dashboardData.status) {
      const existingStatus = modulesDeviceStatus.value.get(moduleId)
      if (existingStatus) {
        // Fusionner les données existantes avec les nouvelles
        modulesDeviceStatus.value.set(moduleId, {
          ...existingStatus,
          ...dashboardData.status,
          system: { ...existingStatus.system, ...dashboardData.status.system },
          sensors: { ...existingStatus.sensors, ...dashboardData.status.sensors },
          sensorsConfig: { ...existingStatus.sensorsConfig, ...dashboardData.status.sensorsConfig },
          hardware: { ...existingStatus.hardware, ...dashboardData.status.hardware }
        })
      } else {
        modulesDeviceStatus.value.set(moduleId, dashboardData.status)
      }
    }

    // Fusionner les données de capteurs au lieu de les remplacer
    if (dashboardData.sensors) {
      const existingData = modulesSensorData.value.get(moduleId) || { co2: [], temp: [], hum: [] }
      const newData = {
        co2: processSensorData(dashboardData.sensors?.co2 || []) as SensorDataPoint[],
        temp: processSensorData(dashboardData.sensors?.temp || []) as SensorDataPoint[],
        hum: processSensorData(dashboardData.sensors?.hum || []) as SensorDataPoint[]
      }

      // Fonction helper pour fusionner sans doublons (basé sur le timestamp)
      const mergeSensorData = (existing: SensorDataPoint[], incoming: SensorDataPoint[]) => {
        const timeMap = new Map<number, SensorDataPoint>()

        // Ajouter les données existantes (priorité aux données WebSocket récentes)
        existing.forEach(point => {
          const timeKey = point.time.getTime()
          if (!timeMap.has(timeKey)) {
            timeMap.set(timeKey, point)
          }
        })

        // Ajouter les nouvelles données historiques (ne pas écraser les existantes)
        incoming.forEach(point => {
          const timeKey = point.time.getTime()
          if (!timeMap.has(timeKey)) {
            timeMap.set(timeKey, point)
          }
        })

        // Convertir en tableau, trier par temps croissant, limiter la taille
        return Array.from(timeMap.values())
          .sort((a, b) => a.time.getTime() - b.time.getTime())
          .slice(-MAX_DATA_POINTS * 2)
      }

      modulesSensorData.value.set(moduleId, {
        co2: mergeSensorData(existingData.co2, newData.co2),
        temp: mergeSensorData(existingData.temp, newData.temp),
        hum: mergeSensorData(existingData.hum, newData.hum)
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

