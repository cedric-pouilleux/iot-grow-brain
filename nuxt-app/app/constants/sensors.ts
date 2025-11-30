export interface SensorConfig {
  key: string
  label: string
  color: string
}

export const SENSOR_LIST: SensorConfig[] = [
  { key: 'co2', label: 'CO2', color: 'emerald' },
  { key: 'temperature', label: 'Température', color: 'orange' },
  { key: 'humidity', label: 'Humidité', color: 'blue' },
  { key: 'pm25', label: 'PM2.5', color: 'violet' },
  { key: 'voc', label: 'COV', color: 'pink' },
  { key: 'pressure', label: 'Pression', color: 'cyan' },
]
