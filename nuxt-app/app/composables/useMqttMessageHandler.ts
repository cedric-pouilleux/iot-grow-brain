import type { DeviceStatus, SystemInfo, SensorStatus, SensorsConfigData, HardwareInfo } from '../types'

/**
 * MQTT Topic Constants
 */
export const MQTT_TOPICS = {
  SYSTEM: '/system',
  SYSTEM_CONFIG: '/system/config',
  SENSORS_STATUS: '/sensors/status',
  SENSORS_CONFIG: '/sensors/config',
  HARDWARE_CONFIG: '/hardware/config',
} as const

/**
 * Sensor topic mappings for MQTT
 */
export const SENSOR_TOPICS = {
  '/co2': 'co2',
  '/temperature': 'temp',
  '/humidity': 'hum',
  '/voc': 'voc',
  '/pressure': 'pressure',
  '/temperature_bmp': 'temperature_bmp',
  '/pm1': 'pm1',
  '/pm25': 'pm25',
  '/pm4': 'pm4',
  '/pm10': 'pm10',
} as const

/**
 * Check if a topic is a status/config topic
 * @param topic - MQTT topic string
 * @returns True if topic is a status or config topic
 */
export function isStatusTopic(topic: string): boolean {
  return (
    topic.endsWith(MQTT_TOPICS.SYSTEM) ||
    topic.endsWith(MQTT_TOPICS.SYSTEM_CONFIG) ||
    topic.endsWith(MQTT_TOPICS.SENSORS_STATUS) ||
    topic.endsWith(MQTT_TOPICS.SENSORS_CONFIG) ||
    topic.endsWith(MQTT_TOPICS.HARDWARE_CONFIG)
  )
}

/**
 * Merge system runtime data (RSSI, memory) into device status
 * @param status - Current device status
 * @param metadata - Incoming system metadata
 */
export function mergeSystemData(status: DeviceStatus, metadata: Partial<SystemInfo>): void {
  if (!status.system) status.system = {}

  if (metadata.rssi !== undefined) {
    status.system.rssi = metadata.rssi
  }

  if (metadata.memory) {
    if (!status.system.memory) status.system.memory = {}

    if (metadata.memory.heapFreeKb !== undefined) {
      status.system.memory.heapFreeKb = metadata.memory.heapFreeKb
    }
    if (metadata.memory.heapMinFreeKb !== undefined) {
      status.system.memory.heapMinFreeKb = metadata.memory.heapMinFreeKb
    }
    if (metadata.memory.psram) {
      status.system.memory.psram = {
        ...status.system.memory.psram,
        ...metadata.memory.psram,
      }
    }
  }
}

/**
 * Merge system configuration data (IP, MAC, flash, etc.) into device status
 * @param status - Current device status
 * @param metadata - Incoming system config metadata
 */
export function mergeSystemConfig(status: DeviceStatus, metadata: Partial<SystemInfo>): void {
  if (!status.system) status.system = {}

  if (metadata.ip) status.system.ip = metadata.ip
  if (metadata.mac) status.system.mac = metadata.mac
  if (metadata.uptimeStart !== undefined) status.system.uptimeStart = metadata.uptimeStart
  if (metadata.flash) status.system.flash = metadata.flash

  // Internal tracking for uptime calculation
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

/**
 * Merge sensor status data into device status
 * @param status - Current device status
 * @param metadata - Incoming sensors status metadata
 */
export function mergeSensorsStatus(
  status: DeviceStatus,
  metadata: Record<string, SensorStatus>
): void {
  if (!status.sensors) status.sensors = {}

  Object.entries(metadata).forEach(([sensorName, sensorData]) => {
    if (!status.sensors![sensorName]) {
      status.sensors![sensorName] = {}
    }

    status.sensors![sensorName] = {
      ...status.sensors![sensorName],
      status: sensorData.status,
      value: sensorData.value,
    }
  })
}

/**
 * Merge sensor configuration data into device status
 * @param status - Current device status
 * @param metadata - Incoming sensors config metadata
 */
export function mergeSensorsConfig(status: DeviceStatus, metadata: SensorsConfigData): void {
  status.sensorsConfig = {
    ...status.sensorsConfig,
    ...metadata,
  }
}

/**
 * Merge hardware configuration data into device status
 * @param status - Current device status
 * @param metadata - Incoming hardware metadata
 */
export function mergeHardwareConfig(status: DeviceStatus, metadata: HardwareInfo): void {
  status.hardware = {
    ...status.hardware,
    ...metadata,
  }
}

/**
 * Composable for handling MQTT messages with shared logic
 * Provides utilities for parsing and merging MQTT data into device status
 */
export function useMqttMessageHandler() {
  return {
    MQTT_TOPICS,
    SENSOR_TOPICS,
    isStatusTopic,
    mergeSystemData,
    mergeSystemConfig,
    mergeSensorsStatus,
    mergeSensorsConfig,
    mergeHardwareConfig,
  }
}
