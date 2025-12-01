import type { DeviceStatus, MqttMessage } from '../types'
import { useMqttMessageHandler } from './useMqttMessageHandler'

/**
 * Composable for managing device status
 * Handles MQTT messages and provides calculated uptime
 */
export const useDeviceStatus = () => {
  const {
    MQTT_TOPICS,
    isStatusTopic,
    mergeSystemData,
    mergeSystemConfig,
    mergeSensorsStatus,
    mergeSensorsConfig,
    mergeHardwareConfig,
  } = useMqttMessageHandler()

  const deviceStatus = ref<DeviceStatus | null>(null)

  /**
   * Initialize device status if it doesn't exist
   */
  const initializeStatus = (): void => {
    if (!deviceStatus.value) {
      deviceStatus.value = {
        system: {},
        sensors: {},
        hardware: {},
        sensorsConfig: {},
      }
    }
  }

  /**
   * Handle incoming MQTT status message
   * @param message - MQTT message
   * @returns True if message was handled, false otherwise
   */
  const handleStatusMessage = (message: MqttMessage): boolean => {
    if (!isStatusTopic(message.topic) || !message.metadata) return false

    initializeStatus()
    const status = deviceStatus.value!

    if (message.topic.endsWith(MQTT_TOPICS.SYSTEM)) {
      mergeSystemData(status, message.metadata as any)
    } else if (message.topic.endsWith(MQTT_TOPICS.SYSTEM_CONFIG)) {
      mergeSystemConfig(status, message.metadata as any)
    } else if (message.topic.endsWith(MQTT_TOPICS.SENSORS_STATUS)) {
      mergeSensorsStatus(status, message.metadata as any)
    } else if (message.topic.endsWith(MQTT_TOPICS.SENSORS_CONFIG)) {
      mergeSensorsConfig(status, message.metadata as any)
    } else if (message.topic.endsWith(MQTT_TOPICS.HARDWARE_CONFIG)) {
      mergeHardwareConfig(status, message.metadata as any)
    }

    return true
  }

  /**
   * Calculate current uptime based on uptimeStart and elapsed time
   */
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
    initializeStatus,
  }
}
