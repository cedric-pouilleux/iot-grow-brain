/**
 * Core types for the IoT Dashboard application
 */

// ============================================================================
// Module Types
// ============================================================================

export interface Module {
  id: string
  name: string
}

// ============================================================================
// Sensor Types
// ============================================================================

export interface SensorDataPoint {
  time: Date
  value: number
}

export interface SensorData {
  co2: SensorDataPoint[]
  temp: SensorDataPoint[]
  hum: SensorDataPoint[]
  voc: SensorDataPoint[]
  pressure: SensorDataPoint[]
  temperature_bmp: SensorDataPoint[]
  pm1: SensorDataPoint[]
  pm25: SensorDataPoint[]
  pm4: SensorDataPoint[]
  pm10: SensorDataPoint[]
}

export interface SensorStatus {
  status?: string
  value?: number
}

export interface SensorIntervalConfig {
  interval?: number
  model?: string
}

export interface SensorsConfigData {
  sensors?: Record<string, SensorIntervalConfig>
}

// ============================================================================
// Hardware Types
// ============================================================================

export interface ChipInfo {
  model?: string
  rev?: number
  cpuFreqMhz?: number
  flashKb?: number
  cores?: number
}

export interface HardwareInfo {
  chip?: ChipInfo
}

// ============================================================================
// System Types
// ============================================================================

export interface FlashInfo {
  size?: number
  used?: number
  usedKb?: number
  freeKb?: number
  systemKb?: number
}

export interface PsramInfo {
  total?: number
  free?: number
}

export interface SystemMemory {
  heapTotalKb?: number
  heapFreeKb?: number
  heapMinFreeKb?: number
  psram?: PsramInfo
}

export interface SystemInfo {
  ip?: string
  mac?: string
  uptimeStart?: number
  flash?: FlashInfo
  memory?: SystemMemory
  rssi?: number
  /** Internal: timestamp when config was received (seconds) */
  _configReceivedAt?: number
  /** Internal: uptime start offset for calculation */
  _uptimeStartOffset?: number
}

// ============================================================================
// Device Status Types
// ============================================================================

export interface DeviceStatus {
  system?: SystemInfo
  sensors?: Record<string, SensorStatus>
  sensorsConfig?: SensorsConfigData
  hardware?: HardwareInfo
}

// ============================================================================
// Dashboard Types
// ============================================================================

export interface DashboardSensorData {
  co2?: Array<{ time: string; value: number }>
  temp?: Array<{ time: string; value: number }>
  hum?: Array<{ time: string; value: number }>
  voc?: Array<{ time: string; value: number }>
  pressure?: Array<{ time: string; value: number }>
  temperature_bmp?: Array<{ time: string; value: number }>
  pm1?: Array<{ time: string; value: number }>
  pm25?: Array<{ time: string; value: number }>
  pm4?: Array<{ time: string; value: number }>
  pm10?: Array<{ time: string; value: number }>
}

export interface DashboardData {
  status: DeviceStatus
  sensors?: DashboardSensorData
}

// ============================================================================
// MQTT Types
// ============================================================================

export interface MqttMessage {
  topic: string
  value: number | null
  time: string
  metadata?: Record<string, unknown>
}

// ============================================================================
// Database Types
// ============================================================================

export interface DbSize {
  size?: number
  unit?: string
}

