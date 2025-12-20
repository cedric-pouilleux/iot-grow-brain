/**
 * Hardware Sensors Configuration
 * 
 * Mapping of physical hardware sensors to their measurement types.
 * Each hardware sensor reads multiple values simultaneously.
 */

export interface HardwareSensorDefinition {
  hardwareKey: string
  name: string
  measurements: readonly string[]
  measurementLabels: Record<string, string>
}

export const HARDWARE_SENSORS: HardwareSensorDefinition[] = [
  {
    hardwareKey: 'mhz14a',
    name: 'MH-Z14A',
    measurements: ['co2'],
    measurementLabels: { co2: 'CO2' }
  },
  {
    hardwareKey: 'sc16co',
    name: 'SC16-CO',
    measurements: ['co'],
    measurementLabels: { co: 'CO' }
  },
  {
    hardwareKey: 'dht22',
    name: 'DHT22',
    measurements: ['temperature', 'humidity'],
    measurementLabels: { temperature: 'Temp', humidity: 'Hum' }
  },
  {
    hardwareKey: 'bmp280',
    name: 'BMP280',
    measurements: ['pressure', 'temperature_bmp'],
    measurementLabels: { pressure: 'Pression', temperature_bmp: 'Temp' }
  },
  {
    hardwareKey: 'sgp40',
    name: 'SGP40',
    measurements: ['voc'],
    measurementLabels: { voc: 'COV' }
  },
  {
    hardwareKey: 'sgp30',
    name: 'SGP30',
    measurements: ['eco2', 'tvoc'],
    measurementLabels: { eco2: 'eCO2', tvoc: 'TCOV' }
  },
  {
    hardwareKey: 'sht30',
    name: 'SHT31',
    measurements: ['temp_sht', 'hum_sht'],
    measurementLabels: { temp_sht: 'Temp', hum_sht: 'Hum' }
  },
  {
    hardwareKey: 'sps30',
    name: 'SPS30',
    measurements: ['pm1', 'pm25', 'pm4', 'pm10'],
    measurementLabels: { pm1: 'PM1', pm25: 'PM2.5', pm4: 'PM4', pm10: 'PM10' }
  },
]
