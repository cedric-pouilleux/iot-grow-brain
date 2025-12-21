/**
 * Types for the modules feature
 * Contains sensor, device, hardware, and system types
 */

// ============================================================================
// Sensor Types
// ============================================================================

export interface SensorDataPoint {
  time: Date
  value: number
}

export interface SensorData {
  co2: SensorDataPoint[]
  co: SensorDataPoint[]
  temp: SensorDataPoint[]
  hum: SensorDataPoint[]
  voc: SensorDataPoint[]
  pressure: SensorDataPoint[]
  temperature_bmp: SensorDataPoint[]
  pm1: SensorDataPoint[]
  pm25: SensorDataPoint[]
  pm4: SensorDataPoint[]
  pm10: SensorDataPoint[]
  eco2: SensorDataPoint[]
  tvoc: SensorDataPoint[]
  temp_sht: SensorDataPoint[]
  hum_sht: SensorDataPoint[]
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
  /** ISO timestamp when ESP32 last booted (persistent) */
  bootedAt?: string | null
  /** Value from system/config to calculate uptime */
  uptimeStart?: number
  /** Internal: timestamp when config was received */
  _configReceivedAt?: number
  /** Internal: offset for uptime calculation */
  _uptimeStartOffset?: number
  flash?: FlashInfo
  memory?: SystemMemory
  rssi?: number
}

// ============================================================================
// Device Status Types
// ============================================================================

export interface DeviceStatus {
  system?: SystemInfo
  sensors?: Record<string, SensorStatus>
  sensorsConfig?: SensorsConfigData
  hardware?: HardwareInfo
  preferences?: Record<string, any>
  zoneName?: string | null
  moduleType?: string | null
}

// ============================================================================
// Dashboard Types
// ============================================================================

export interface DashboardSensorData {
  co2?: Array<{ time: string; value: number }>
  co?: Array<{ time: string; value: number }>
  temp?: Array<{ time: string; value: number }>
  hum?: Array<{ time: string; value: number }>
  voc?: Array<{ time: string; value: number }>
  pressure?: Array<{ time: string; value: number }>
  temperature_bmp?: Array<{ time: string; value: number }>
  pm1?: Array<{ time: string; value: number }>
  pm25?: Array<{ time: string; value: number }>
  pm4?: Array<{ time: string; value: number }>
  pm10?: Array<{ time: string; value: number }>
  eco2?: Array<{ time: string; value: number }>
  tvoc?: Array<{ time: string; value: number }>
  temp_sht?: Array<{ time: string; value: number }>
  hum_sht?: Array<{ time: string; value: number }>
}

export interface DashboardData {
  status: DeviceStatus
  sensors?: DashboardSensorData
}
