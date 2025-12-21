import { sensorRegistry } from '../utils/SensorRegistry'
import { sensorRanges } from './sensors'

export function registerStandardSensors() {
  // ============================================================================
  // CO2
  // ============================================================================
  sensorRegistry.register({
    key: 'co2',
    label: 'CO2',
    unit: 'ppm',
    range: [sensorRanges.co2.min, sensorRanges.co2.max],
    type: 'gas',
    sources: ['mhz14a']
  })
  
  sensorRegistry.register({
    key: 'eco2',
    label: 'eCO2',
    unit: 'ppm',
    range: [sensorRanges.eco2.min, sensorRanges.eco2.max],
    type: 'gas',
    sources: ['sgp30']
  })

  // ============================================================================
  // Temperature
  // ============================================================================
  sensorRegistry.register({
    key: 'temperature',
    label: 'Température',
    unit: '°C',
    range: [sensorRanges.temperature.min, sensorRanges.temperature.max],
    type: 'weather',
    sources: ['dht22']
  })
  sensorRegistry.register({
    key: 'temp',
    label: 'Température',
    unit: '°C',
    range: [sensorRanges.temp.min, sensorRanges.temp.max],
    type: 'weather',
    sources: ['dht22']  // Legacy key
  })
  sensorRegistry.register({
    key: 'temperature_bmp',
    label: 'Température (BMP)',
    unit: '°C',
    range: [sensorRanges.temperature_bmp.min, sensorRanges.temperature_bmp.max],
    type: 'weather',
    sources: ['bmp280']
  })
  sensorRegistry.register({
    key: 'temp_sht',
    label: 'Température (SHT)',
    unit: '°C',
    range: [sensorRanges.temp_sht.min, sensorRanges.temp_sht.max],
    type: 'weather',
    sources: ['sht40']
  })

  // ============================================================================
  // Humidity
  // ============================================================================
  sensorRegistry.register({
    key: 'humidity',
    label: 'Humidité',
    unit: '%',
    range: [sensorRanges.humidity.min, sensorRanges.humidity.max],
    type: 'weather',
    sources: ['dht22']
  })
  sensorRegistry.register({
    key: 'hum',
    label: 'Humidité',
    unit: '%',
    range: [sensorRanges.hum.min, sensorRanges.hum.max],
    type: 'weather',
    sources: ['dht22']  // Legacy key
  })
  sensorRegistry.register({
    key: 'hum_sht',
    label: 'Humidité (SHT)',
    unit: '%',
    range: [sensorRanges.hum_sht.min, sensorRanges.hum_sht.max],
    type: 'weather',
    sources: ['sht40']
  })

  // ============================================================================
  // Pressure
  // ============================================================================
  sensorRegistry.register({
    key: 'pressure',
    label: 'Pression',
    unit: 'hPa',
    range: [sensorRanges.pressure.min, sensorRanges.pressure.max],
    type: 'weather',
    sources: ['bmp280']
  })

  // ============================================================================
  // VOC / TVOC
  // ============================================================================
  sensorRegistry.register({
    key: 'voc',
    label: 'COV',
    unit: '/500',
    range: [sensorRanges.voc.min, sensorRanges.voc.max],
    type: 'gas',
    sources: ['sgp40']
  })
  sensorRegistry.register({
    key: 'tvoc',
    label: 'TCOV',
    unit: 'ppb',
    range: [sensorRanges.tvoc.min, sensorRanges.tvoc.max],
    type: 'gas',
    sources: ['sgp30']
  })

  // ============================================================================
  // CO
  // ============================================================================
  sensorRegistry.register({
    key: 'co',
    label: 'CO',
    unit: 'ppm',
    range: [sensorRanges.co.min, sensorRanges.co.max],
    type: 'gas',
    sources: ['mq7']
  })

  // ============================================================================
  // PM (Particulate Matter)
  // ============================================================================
  sensorRegistry.register({
    key: 'pm1',
    label: 'PM1.0',
    unit: 'µg/m³',
    range: [sensorRanges.pm1.min, sensorRanges.pm1.max],
    type: 'pm',
    sources: ['sps30']
  })
  sensorRegistry.register({
    key: 'pm25',
    label: 'PM2.5',
    unit: 'µg/m³',
    range: [sensorRanges.pm25.min, sensorRanges.pm25.max],
    type: 'pm',
    sources: ['sps30']
  })
  sensorRegistry.register({
    key: 'pm4',
    label: 'PM4.0',
    unit: 'µg/m³',
    range: [sensorRanges.pm4.min, sensorRanges.pm4.max],
    type: 'pm',
    sources: ['sps30']
  })
  sensorRegistry.register({
    key: 'pm10',
    label: 'PM10',
    unit: 'µg/m³',
    range: [sensorRanges.pm10.min, sensorRanges.pm10.max],
    type: 'pm',
    sources: ['sps30']
  })
}

