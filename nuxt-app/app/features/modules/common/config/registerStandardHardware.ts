/**
 * registerStandardHardware
 * 
 * Registers all standard hardware sensors with their capabilities.
 * Called at app initialization.
 */

import { hardwareRegistry } from '../utils/HardwareRegistry'

export function registerStandardHardware() {
  // ============================================================================
  // Temperature & Humidity Sensors
  // ============================================================================
  
  hardwareRegistry.register({
    id: 'dht22',
    name: 'DHT22',
    capabilities: ['temperature', 'humidity']
  })

  hardwareRegistry.register({
    id: 'sht40',
    name: 'SHT40',
    capabilities: ['temp_sht', 'hum_sht']
  })

  // ============================================================================
  // Environmental Sensors
  // ============================================================================

  hardwareRegistry.register({
    id: 'bmp280',
    name: 'BMP280',
    capabilities: ['temperature_bmp', 'pressure']
  })

  // ============================================================================
  // Gas / Air Quality Sensors
  // ============================================================================

  hardwareRegistry.register({
    id: 'mhz14a',
    name: 'MH-Z14A',
    capabilities: ['co2']
  })

  hardwareRegistry.register({
    id: 'sgp40',
    name: 'SGP40',
    capabilities: ['voc']
  })

  hardwareRegistry.register({
    id: 'sgp30',
    name: 'SGP30',
    capabilities: ['eco2', 'tvoc']
  })

  hardwareRegistry.register({
    id: 'mq7',
    name: 'MQ-7',
    capabilities: ['co']
  })

  // ============================================================================
  // Particulate Matter Sensors
  // ============================================================================

  hardwareRegistry.register({
    id: 'sps30',
    name: 'SPS30',
    capabilities: ['pm1', 'pm25', 'pm4', 'pm10']
  })
}
