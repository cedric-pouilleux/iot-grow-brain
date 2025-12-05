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
  // Cache for delta updates - only broadcast if data changed
  private lastBroadcastedPayload: Map<string, string> = new Map()

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
   * Handle device log messages
   */
  private handleDeviceLog(topic: string, payload: string, moduleId: string): boolean {
    if (!topic.endsWith('/logs')) {
      return false
    }

    try {
      const logEntry = JSON.parse(payload)
      const { level, msg, time } = logEntry

      // Log to console to trace the flow (bypasses Pino to ensure we see it)
      console.log(
        `[MQTT DEBUG] Received ESP32 log: topic=${topic}, moduleId=${moduleId}, level=${level}, msg=${msg}`
      )

      const logData = {
        msg: `[ESP32] ${msg}`,
        moduleId,
        deviceTime: time,
        source: 'esp32',
      }

      // Use the appropriate Pino method based on the log level
      const logLevel = (level || 'info').toLowerCase()
      console.log(`[MQTT DEBUG] Calling Pino method: ${logLevel}`)
      switch (logLevel) {
        case 'trace':
          this.fastify.log.trace(logData)
          break
        case 'debug':
          this.fastify.log.debug(logData)
          break
        case 'warn':
          this.fastify.log.warn(logData)
          break
        case 'success':
          this.fastify.log.success(logData)
          break
        case 'error':
          this.fastify.log.error(logData)
          break
        case 'fatal':
          this.fastify.log.fatal(logData)
          break
        case 'info':
        default:
          this.fastify.log.info(logData)
          break
      }
      console.log(`[MQTT DEBUG] Log sent to Pino successfully`)
      return true
    } catch (e) {
      console.error(`[MQTT DEBUG] Failed to parse device log from ${topic}:`, e)
      this.fastify.log.warn(`⚠️ [MQTT] Failed to parse device log from ${topic}: ${e}`)
      return false
    }
  }

  /**
   * Validate sensor value to reject aberrant readings
   */
  private isValueValid(sensorType: string, value: number): boolean {
    // Define valid ranges for each sensor type
    const ranges: Record<string, { min: number; max: number }> = {
      co2: { min: 0, max: 10000 },           // ppm
      temperature: { min: -40, max: 85 },     // °C (DHT22 range)
      humidity: { min: 0, max: 100 },         // %
      voc: { min: 0, max: 500 },              // VOC index
      pressure: { min: 300, max: 1200 },      // hPa (valid atmospheric range)
      temperature_bmp: { min: -40, max: 85 }, // °C (BMP280 range)
    }

    const range = ranges[sensorType]
    if (!range) return true // Unknown sensor type, allow

    if (value < range.min || value > range.max) {
      this.fastify.log.warn({
        msg: `[MQTT] ⚠️ Aberrant value rejected: ${sensorType}=${value} (valid range: ${range.min}-${range.max})`,
        sensorType,
        value,
        min: range.min,
        max: range.max,
      })
      return false
    }
    return true
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

      // Validate value range
      if (!this.isValueValid(sensorType, value)) {
        return true // Message was handled (rejected), don't try other handlers
      }

      this.measurementBuffer.push({ time: now, moduleId, sensorType, value })
      this.fastify.log.info({
        msg: `[MQTT] 📥 ${sensorType}=${value} from ${moduleId}`,
        moduleId,
        sensorType,
        value,
        bufferSize: this.measurementBuffer.length,
      })

      if (this.measurementBuffer.length >= 100) {
        void this.onMeasurementBufferFull()
      }
      return true
    }

    // Format: module_id/sensor_type (ESP32 format)
    if (parts.length === 2) {
      const sensorType = parts[1]
      const validTypes = ['co2', 'temperature', 'humidity', 'voc', 'pressure', 'temperature_bmp']

      if (!validTypes.includes(sensorType)) {
        return false
      }

      const value = parseFloat(payload)
      if (isNaN(value)) {
        return false
      }

      // Validate value range
      if (!this.isValueValid(sensorType, value)) {
        return true // Message was handled (rejected), don't try other handlers
      }

      this.measurementBuffer.push({ time: now, moduleId, sensorType, value })
      this.fastify.log.info({
        msg: `[MQTT] 📥 ${sensorType}=${value} from ${moduleId}`,
        moduleId,
        sensorType,
        value,
        bufferSize: this.measurementBuffer.length,
      })

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

    // Debug: log all /logs topics
    if (topic.endsWith('/logs')) {
      console.log(
        `[MQTT DEBUG] Received message on /logs topic: ${topic}, payload: ${payload.substring(0, 200)}`
      )
    }

    // Debug: log pressure and temperature_bmp topics
    if (topic.includes('/pressure') || topic.includes('/temperature_bmp')) {
      console.log(
        `[MQTT DEBUG] Received message on sensor topic: ${topic}, payload: ${payload}, parsed: ${parsed ? 'OK' : 'FAILED'}`
      )
    }

    if (!parsed) {
      if (topic.endsWith('/logs')) {
        console.log(`[MQTT DEBUG] Topic ${topic} was rejected by parseTopic`)
      }
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
    } else if (this.handleDeviceLog(topic, payload, moduleId)) {
      // Handled
      console.log(`[MQTT DEBUG] handleDeviceLog returned true for ${topic}`)
    } else if (this.handleSensorMeasurement(topic, payload, parsed, now)) {
      // Handled
    } else {
      if (topic.endsWith('/logs')) {
        console.log(`[MQTT DEBUG] Topic ${topic} was not handled by any handler`)
      }
      this.fastify.log.info(`⚠️ Topic not processed: ${topic} (parts: ${parsed.parts.join(', ')})`)
    }

    // Broadcast via WebSocket (with delta check)
    const wsData = this.prepareWebSocketData(topic, payload, parsed, now)
    if (wsData && this.fastify.io) {
      const clientCount = this.fastify.io.sockets.sockets.size 
      if (clientCount > 0) {
        // Check if data has changed before broadcasting
        const lastPayload = this.lastBroadcastedPayload.get(topic)
        if (lastPayload !== payload) {
          this.lastBroadcastedPayload.set(topic, payload)
          this.fastify.io.emit('mqtt:data', wsData)

          this.fastify.log.info({
            msg: `[WEBSOCKET] Data changed, sent to frontend - ${parsed.moduleId} - ${topic}`,
            moduleId: parsed.moduleId,
            topic,
          })
        }
        // If data is the same, don't broadcast (delta update optimization)
      }
      // No logging when no clients connected - it's expected behavior
    }
  }
}
