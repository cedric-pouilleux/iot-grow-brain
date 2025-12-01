import type { FastifyInstance } from 'fastify'
import type { MqttMeasurement, DeviceStatusUpdate, WebSocketMqttData } from '../../types/mqtt'
import { MqttRepository } from './mqttRepository'

type TopicParts = {
  moduleId: string
  category: string | null
  sensorType: string | null
  parts: string[]
}

export class MqttMessageHandler {
  constructor(
    private fastify: FastifyInstance,
    private mqttRepo: MqttRepository,
    private measurementBuffer: MqttMeasurement[],
    private statusUpdateBuffer: DeviceStatusUpdate[],
    private onStatusBufferFull: () => Promise<void>,
    private onMeasurementBufferFull: () => Promise<void>
  ) {}

  /**
   * Parse topic structure: module_id/category/sensor_type
   */
  private parseTopic(topic: string): TopicParts | null {
    const parts = topic.split('/')
    if (parts.length < 2) {
      this.fastify.log.debug(`⚠️ Topic ignored (too short): ${topic}`)
      return null
    }

    const moduleId = parts[0]

    // Skip test topics
    if (moduleId.startsWith('home/') || moduleId.startsWith('dev/') || moduleId === 'test-module') {
      return null
    }

    return {
      moduleId,
      category: parts.length > 1 ? parts[1] : null,
      sensorType: parts.length > 2 ? parts[2] : null,
      parts,
    }
  }

  /**
   * Handle system messages (system or system/config)
   */
  private handleSystemMessage(topic: string, payload: string, moduleId: string): boolean {
    if (!topic.endsWith('/system') && !topic.endsWith('/system/config')) {
      return false
    }

    try {
      const metadata = JSON.parse(payload)
      const type = topic.endsWith('/config') ? 'system_config' : 'system'
      this.statusUpdateBuffer.push({ moduleId, type, data: metadata })

      if (this.statusUpdateBuffer.length >= 50) {
        void this.onStatusBufferFull()
      }
      return true
    } catch (e) {
      this.fastify.log.warn(`⚠️ Failed to parse system message from ${topic}: ${e}`)
      return false
    }
  }

  /**
   * Handle sensor status messages
   */
  private handleSensorStatusMessage(topic: string, payload: string, moduleId: string): boolean {
    if (!topic.endsWith('/sensors/status')) {
      return false
    }

    try {
      const metadata = JSON.parse(payload)
      this.statusUpdateBuffer.push({ moduleId, type: 'sensors_status', data: metadata })
      return true
    } catch (e) {
      this.fastify.log.warn(`⚠️ Failed to parse sensors/status from ${topic}: ${e}`)
      return false
    }
  }

  /**
   * Handle sensor config messages
   */
  private handleSensorConfigMessage(topic: string, payload: string, moduleId: string): boolean {
    if (!topic.endsWith('/sensors/config')) {
      return false
    }

    try {
      const metadata = JSON.parse(payload)
      this.statusUpdateBuffer.push({ moduleId, type: 'sensors_config', data: metadata })
      return true
    } catch (e) {
      this.fastify.log.warn(`⚠️ Failed to parse sensors/config from ${topic}: ${e}`)
      return false
    }
  }

  /**
   * Handle hardware config messages
   */
  private handleHardwareMessage(topic: string, payload: string, moduleId: string): boolean {
    if (!topic.endsWith('/hardware/config')) {
      return false
    }

    try {
      const metadata = JSON.parse(payload)
      this.statusUpdateBuffer.push({ moduleId, type: 'hardware', data: metadata })
      return true
    } catch (e) {
      this.fastify.log.warn(`⚠️ Failed to parse hardware/config from ${topic}: ${e}`)
      return false
    }
  }

  /**
   * Handle sensor measurement messages
   */
  private handleSensorMeasurement(
    topic: string,
    payload: string,
    parsed: TopicParts,
    now: Date
  ): boolean {
    const { moduleId, category, sensorType, parts } = parsed

    // Format: module_id/sensors/sensor_type
    if (category === 'sensors' && sensorType) {
      const value = parseFloat(payload)
      if (isNaN(value)) {
        this.fastify.log.warn(`⚠️ Invalid measurement value from ${topic}: "${payload}"`)
        return false
      }

      this.measurementBuffer.push({ time: now, moduleId, sensorType, value })
      this.fastify.log.info(
        `📊 Measurement buffered: ${moduleId}/sensors/${sensorType} = ${value} (buffer: ${this.measurementBuffer.length})`
      )

      if (this.measurementBuffer.length >= 100) {
        void this.onMeasurementBufferFull()
      }
      return true
    }

    // Format: module_id/sensor_type (ESP32 format)
    if (parts.length === 2) {
      const sensorType = parts[1]
      const validTypes = ['co2', 'temperature', 'humidity', 'voc']

      if (!validTypes.includes(sensorType)) {
        this.fastify.log.debug(`⚠️ Topic not a sensor measurement: ${topic} (value: ${payload})`)
        return false
      }

      const value = parseFloat(payload)
      if (isNaN(value)) {
        return false
      }

      this.measurementBuffer.push({ time: now, moduleId, sensorType, value })
      this.fastify.log.info(
        `📊 Measurement buffered: ${moduleId}/${sensorType} = ${value} (buffer: ${this.measurementBuffer.length})`
      )

      if (this.measurementBuffer.length >= 100) {
        void this.onMeasurementBufferFull()
      }
      return true
    }

    return false
  }

  /**
   * Prepare WebSocket data for broadcast
   */
  private prepareWebSocketData(
    topic: string,
    payload: string,
    parsed: TopicParts | null,
    now: Date
  ): WebSocketMqttData | null {
    if (!this.fastify.io) {
      return null
    }

    let wsValue: number | null = null
    let wsMetadata: Record<string, unknown> | null = null

    // JSON messages (metadata)
    if (
      topic.endsWith('/system') ||
      topic.endsWith('/system/config') ||
      topic.endsWith('/sensors/status') ||
      topic.endsWith('/sensors/config') ||
      topic.endsWith('/hardware/config')
    ) {
      try {
        wsMetadata = JSON.parse(payload) as Record<string, unknown>
      } catch {
        // Ignore parse errors
      }
    }
    // Numeric sensor measurements
    else if (
      parsed &&
      (parsed.parts.length === 2 || (parsed.category === 'sensors' && parsed.parts.length === 3))
    ) {
      const numValue = parseFloat(payload)
      if (!isNaN(numValue)) {
        wsValue = numValue
      }
    }

    if (wsValue === null && wsMetadata === null) {
      return null
    }

    return {
      topic,
      value: wsValue,
      metadata: wsMetadata,
      time: now.toISOString(),
    }
  }

  /**
   * Main handler for MQTT messages
   */
  async handleMessage(topic: string, message: Buffer): Promise<void> {
    const payload = message.toString()
    const now = new Date()
    const parsed = this.parseTopic(topic)

    if (!parsed) {
      return
    }

    const { moduleId } = parsed

    // Try handlers in order
    if (this.handleSystemMessage(topic, payload, moduleId)) {
      // Handled
    } else if (this.handleSensorStatusMessage(topic, payload, moduleId)) {
      // Handled
    } else if (this.handleSensorConfigMessage(topic, payload, moduleId)) {
      // Handled
    } else if (this.handleHardwareMessage(topic, payload, moduleId)) {
      // Handled
    } else if (this.handleSensorMeasurement(topic, payload, parsed, now)) {
      // Handled
    } else {
      this.fastify.log.info(`⚠️ Topic not processed: ${topic} (parts: ${parsed.parts.join(', ')})`)
    }

    // Broadcast via WebSocket
    const wsData = this.prepareWebSocketData(topic, payload, parsed, now)
    if (wsData && this.fastify.io) {
      this.fastify.io.emit('mqtt:data', wsData)
    }
  }
}
