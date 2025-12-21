/**
 * Sensor & Hardware Configuration
 * 
 * Configuration statique pour les capteurs et hardware.
 * 12 clés canoniques : co2, eco2, temperature, humidity, pressure, voc, tvoc, co, pm1, pm25, pm4, pm10
 */

// =============================================================================
// Types
// =============================================================================

export interface SensorDefinition {
  label: string
  unit: string
  range: { min: number; max: number }
  type: 'pm' | 'gas' | 'weather' | 'other'
}

export interface HardwareDefinition {
  name: string
  measures: readonly string[]
}

// =============================================================================
// Sensors Configuration (12 canonical keys)
// =============================================================================

export const SENSORS = {
  // Gas sensors
  co2: { label: 'CO2', unit: 'ppm', range: { min: 0, max: 10000 }, type: 'gas' },
  eco2: { label: 'eCO2', unit: 'ppm', range: { min: 0, max: 10000 }, type: 'gas' },
  voc: { label: 'COV', unit: '/500', range: { min: 0, max: 500 }, type: 'gas' },
  tvoc: { label: 'TCOV', unit: 'ppb', range: { min: 0, max: 5000 }, type: 'gas' },
  co: { label: 'CO', unit: 'ppm', range: { min: 0, max: 1000 }, type: 'gas' },
  
  // Weather sensors
  temperature: { label: 'Température', unit: '°C', range: { min: -10, max: 50 }, type: 'weather' },
  humidity: { label: 'Humidité', unit: '%', range: { min: 0, max: 100 }, type: 'weather' },
  pressure: { label: 'Pression', unit: 'hPa', range: { min: 300, max: 1100 }, type: 'weather' },
  
  // Particulate Matter
  pm1: { label: 'PM1.0', unit: 'µg/m³', range: { min: 0, max: 5000 }, type: 'pm' },
  pm25: { label: 'PM2.5', unit: 'µg/m³', range: { min: 0, max: 5000 }, type: 'pm' },
  pm4: { label: 'PM4.0', unit: 'µg/m³', range: { min: 0, max: 5000 }, type: 'pm' },
  pm10: { label: 'PM10', unit: 'µg/m³', range: { min: 0, max: 5000 }, type: 'pm' },
} as const satisfies Record<string, SensorDefinition>

export type SensorKey = keyof typeof SENSORS

// =============================================================================
// Hardware Configuration
// =============================================================================

export const HARDWARE = {
  dht22: { name: 'DHT22', measures: ['temperature', 'humidity'] },
  sht40: { name: 'SHT40', measures: ['temperature', 'humidity'] },
  bmp280: { name: 'BMP280', measures: ['temperature', 'pressure'] },
  mhz14a: { name: 'MH-Z14A', measures: ['co2'] },
  sgp40: { name: 'SGP40', measures: ['voc'] },
  sgp30: { name: 'SGP30', measures: ['eco2', 'tvoc'] },
  mq7: { name: 'MQ-7', measures: ['co'] },
  sps30: { name: 'SPS30', measures: ['pm1', 'pm25', 'pm4', 'pm10'] },
} as const satisfies Record<string, HardwareDefinition>

export type HardwareId = keyof typeof HARDWARE

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get sensor definition by key
 */
export function getSensor(key: string): SensorDefinition | undefined {
  // Handle composite keys (e.g. dht22:temperature)
  const realKey = key.includes(':') ? key.split(':')[1] : key
  return SENSORS[realKey as SensorKey]
}

/**
 * Get sensor unit
 */
export function getUnit(key: string): string {
  return getSensor(key)?.unit ?? ''
}

/**
 * Get sensor range for chart axis
 */
export function getSensorRange(key: string): { min: number; max: number } | null {
  return getSensor(key)?.range ?? null
}

/**
 * Get normalization ratio (always 1, feature simplified)
 */
export function getNormalizationRatio(_sensorKey: string): number {
  return 1
}

/**
 * Match MQTT topic to composite sensor key
 * Handles 3-part format: module/hardware/measurement
 * Returns: hardware_id:sensor_type (e.g., "dht22:temperature")
 */
export function matchTopic(topic: string): string | undefined {
  const parts = topic.split('/')
  
  // Handle 2-part legacy format: module/sensorType
  if (parts.length === 2) {
    const measurementType = parts[1]
    if (SENSORS[measurementType as SensorKey]) {
      return measurementType
    }
    return undefined
  }

  if (parts.length !== 3) return undefined
  
  const hardwareId = parts[1]
  const measurementType = parts[2]
  
  // Skip system topics
  if (['sensors', 'system', 'hardware'].includes(hardwareId)) {
    return undefined
  }
  
  // All hardware uses canonical keys now - return composite key
  if (SENSORS[measurementType as SensorKey]) {
    return `${hardwareId}:${measurementType}`
  }
  
  return undefined
}

/**
 * Get hardware definition by ID
 */
export function getHardware(id: string): HardwareDefinition | undefined {
  return HARDWARE[id as HardwareId]
}

/**
 * Get hardware that measures a specific sensor type
 */
export function getHardwareForSensor(sensorKey: string): HardwareDefinition | undefined {
  const entry = Object.entries(HARDWARE).find(([_, hw]) => 
    (hw.measures as readonly string[]).includes(sensorKey)
  )
  return entry?.[1]
}

// =============================================================================
// Composite Key Helpers
// =============================================================================

/**
 * Parse a composite key (hardware_id:sensor_type) into parts
 */
export function parseCompositeKey(key: string): { hardwareId: string; sensorType: string } | null {
  const parts = key.split(':')
  if (parts.length !== 2) return null
  return { hardwareId: parts[0], sensorType: parts[1] }
}

/**
 * Get sensor type from a composite key
 */
export function getSensorTypeFromKey(key: string): string {
  const parsed = parseCompositeKey(key)
  return parsed?.sensorType ?? key
}

/**
 * Get hardware ID from a composite key
 */
export function getHardwareIdFromKey(key: string): string | null {
  const parsed = parseCompositeKey(key)
  return parsed?.hardwareId ?? null
}

/**
 * Create a composite key from hardware ID and sensor type
 */
export function createCompositeKey(hardwareId: string, sensorType: string): string {
  return `${hardwareId}:${sensorType}`
}
