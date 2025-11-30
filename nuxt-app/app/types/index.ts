/**
 * Types TypeScript pour l'application IoT
 */

export interface Module {
  id: string
  name: string
}

export interface SensorDataPoint {
  time: Date
  value: number
}

export interface SensorData {
  co2: SensorDataPoint[]
  temp: SensorDataPoint[]
  hum: SensorDataPoint[]
}

export interface SystemMemory {
  heapTotalKb?: number
  heapFreeKb?: number
  heapMinFreeKb?: number
  psram?: {
    total?: number
    free?: number
  }
}

export interface SystemInfo {
  ip?: string
  mac?: string
  uptimeStart?: number
  flash?: {
    size?: number
    used?: number
    usedKb?: number
    freeKb?: number
    systemKb?: number
  }
  memory?: SystemMemory
  rssi?: number
  _configReceivedAt?: number
  _uptimeStartOffset?: number
}

export interface SensorStatus {
  status?: string
  value?: number
}

export interface DeviceStatus {
  system?: SystemInfo
  sensors?: Record<string, SensorStatus>
  sensorsConfig?: Record<string, any>
  hardware?: Record<string, any>
}

export interface DashboardData {
  status: DeviceStatus
  sensors?: {
    co2?: Array<{ time: string; value: number }>
    temp?: Array<{ time: string; value: number }>
    hum?: Array<{ time: string; value: number }>
  }
}

export interface MqttMessage {
  topic: string
  value: number | null
  time: string
  metadata?: any
}

export interface DbSize {
  size?: number
  unit?: string
}
