/**
 * MQTT message types
 * Types alignés avec le schéma Drizzle (camelCase)
 */

// Type pour les mesures MQTT (aligné avec le schéma measurements)
export interface MqttMeasurement {
  time: Date
  moduleId: string
  sensorType: string
  value: number
}

export type DeviceStatusUpdateType =
  | 'system'
  | 'system_config'
  | 'sensors_status'
  | 'sensors_config'
  | 'hardware'

export interface DeviceStatusUpdate {
  moduleId: string
  type: DeviceStatusUpdateType
  data: SystemData | SystemConfigData | SensorsStatusData | SensorsConfigData | HardwareData
}

// System real-time data (camelCase aligné avec Drizzle)
export interface SystemData {
  rssi?: number
  memory?: {
    heapFreeKb?: number
    heapMinFreeKb?: number
  }
}

// System configuration (static) - camelCase aligné avec Drizzle
export interface SystemConfigData {
  ip?: string
  mac?: string
  moduleType?: string  // e.g. "air-quality-bench"
  uptimeStart?: string | number
  flash?: {
    usedKb?: number
    freeKb?: number
    systemKb?: number
  }
  memory?: {
    heapTotalKb?: number
  }
}

// Sensors status (aligné avec sensorStatus schema)
export interface SensorsStatusData {
  [sensorType: string]: {
    status: string
    value: number | null
  }
}

// Sensors configuration (aligné avec sensorConfig schema)
export interface SensorsConfigData {
  [sensorType: string]: {
    interval?: number
    model?: string
  }
}

// Hardware information (camelCase aligné avec deviceHardware schema)
export interface HardwareData {
  chip?: {
    model?: string
    rev?: number
    cpuFreqMhz?: number
    flashKb?: number
    cores?: number
  }
}

// Module configuration (for publishing)
export interface ModuleConfig {
  sensors?: Record<
    string,
    {
      interval?: number
      model?: string
    }
  >
}

// WebSocket broadcast data
export interface WebSocketMqttData {
  topic: string
  value: number | null
  metadata: Record<string, unknown> | null
  time: string
}
