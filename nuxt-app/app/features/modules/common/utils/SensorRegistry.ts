export interface SensorDefinition {
  key: string
  label: string
  unit?: string
  color?: string
  range?: [number, number]
  type?: 'pm' | 'gas' | 'weather' | 'other'
  /** Hardware IDs that produce this measurement (e.g., ['dht22', 'bmp280']) */
  sources?: string[]
}

class SensorRegistry {
  private sensors = new Map<string, SensorDefinition>()

  register(definition: SensorDefinition) {
    this.sensors.set(definition.key, definition)
  }

  get(key: string): SensorDefinition | undefined {
    return this.sensors.get(key)
  }

  getAll(): SensorDefinition[] {
    return Array.from(this.sensors.values())
  }

  /**
   * Get the hardware sources for a sensor key
   */
  getHardwareSources(key: string): string[] {
    return this.get(key)?.sources || []
  }

  /**
   * Check if a topic matches a registered sensor
   * Handles both formats:
   * - 2-part: module/sensor_type (legacy)
   * - 3-part: module/hardware/measurement (new)
   * Returns the sensor key if found
   */
  matchesTopic(topic: string): string | undefined {
    const parts = topic.split('/')
    
    // 3-part format: module/hardware/measurement
    if (parts.length === 3) {
      const hardwareId = parts[1]
      const measurementType = parts[2]
      
      // Skip system topics
      if (hardwareId === 'sensors' || hardwareId === 'system' || hardwareId === 'hardware') {
        return undefined
      }
      
      // Hardware-specific key mappings (must match backend)
      const keyMappings: Record<string, Record<string, string>> = {
        'bmp280': { 'temperature': 'temperature_bmp', 'pressure': 'pressure' },
        'sht40': { 'temperature': 'temp_sht', 'humidity': 'hum_sht' },
        'dht22': { 'temperature': 'temperature', 'humidity': 'humidity' },
        'sgp30': { 'eco2': 'eco2', 'tvoc': 'tvoc' },
        'sgp40': { 'voc': 'voc' },
        'sps30': { 'pm1': 'pm1', 'pm25': 'pm25', 'pm4': 'pm4', 'pm10': 'pm10' },
        'mhz14a': { 'co2': 'co2' },
        'mq7': { 'co': 'co' }
      }
      
      // Look up the mapped key
      const hardwareMap = keyMappings[hardwareId]
      if (hardwareMap && hardwareMap[measurementType]) {
        const mappedKey = hardwareMap[measurementType]
        return this.sensors.has(mappedKey) ? mappedKey : undefined
      }
      
      // Fallback: try direct measurement match
      if (this.sensors.has(measurementType)) {
        return measurementType
      }
      
      return undefined
    }
    
    return undefined
  }
}

export const sensorRegistry = new SensorRegistry()

