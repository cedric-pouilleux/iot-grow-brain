import type { DeviceStatus, MqttMessage } from '../types'

const TOPIC_SYSTEM = '/system'
const TOPIC_SYSTEM_CONFIG = '/system/config'
const TOPIC_SENSORS_STATUS = '/sensors/status'
const TOPIC_SENSORS_CONFIG = '/sensors/config'
const TOPIC_HARDWARE_CONFIG = '/hardware/config'

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

export const useDeviceStatus = () => {
  const deviceStatus = ref<DeviceStatus | null>(null)

  const initializeStatus = () => {
    if (!deviceStatus.value) {
      deviceStatus.value = { system: {}, sensors: {}, hardware: {}, sensorsConfig: {} }
    }
  }

  const handleStatusMessage = (message: MqttMessage) => {
    if (!isStatusTopic(message.topic) || !message.metadata) return false

    initializeStatus()
    const status = deviceStatus.value!

    if (message.topic.endsWith(TOPIC_SYSTEM)) {
      mergeSystemData(status, message.metadata)
    } else if (message.topic.endsWith(TOPIC_SYSTEM_CONFIG)) {
      mergeSystemConfig(status, message.metadata)
    } else if (message.topic.endsWith(TOPIC_SENSORS_STATUS)) {
      mergeSensorsStatus(status, message.metadata)
    } else if (message.topic.endsWith(TOPIC_SENSORS_CONFIG)) {
      status.sensorsConfig = { ...status.sensorsConfig, ...message.metadata }
    } else if (message.topic.endsWith(TOPIC_HARDWARE_CONFIG)) {
      status.hardware = { ...status.hardware, ...message.metadata }
    }

    return true
  }

  const calculatedUptime = computed(() => {
    if (!deviceStatus.value?.system?.uptimeStart) return null

    const now = Math.floor(Date.now() / 1000)
    const system = deviceStatus.value.system

    if (!system._configReceivedAt) {
      system._configReceivedAt = now
      system._uptimeStartOffset = system.uptimeStart
    }

    const elapsedSinceConfig = now - system._configReceivedAt
    return system._uptimeStartOffset! + elapsedSinceConfig
  })

  return {
    deviceStatus: deviceStatus as Ref<DeviceStatus | null>,
    calculatedUptime,
    handleStatusMessage,
    initializeStatus
  }
}
