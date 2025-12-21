import type { SensorData } from '../types'
import type { MqttMessage } from '~/types'
import { processSensorData } from '~/utils/data-processing'

const SENSOR_TOPICS = {
  '/co2': 'co2',
  '/temperature': 'temp',
  '/humidity': 'hum',
  '/voc': 'voc',
  '/pressure': 'pressure',
  '/temperature_bmp': 'temperature_bmp',
} as const

const MAX_DATA_POINTS = 100

export const useSensorData = () => {
  const sensorData = ref<SensorData>({
    co2: [],
    co: [],
    temp: [],
    hum: [],
    voc: [],
    pressure: [],
    temperature_bmp: [],
    pm1: [],
    pm25: [],
    pm4: [],
    pm10: [],
    eco2: [],
    tvoc: [],
    temp_sht: [],
    hum_sht: [],
  })

  const addDataPoint = (topic: string, value: number, time: string) => {
    const sensorKey = Object.entries(SENSOR_TOPICS).find(([suffix]) =>
      topic.endsWith(suffix)
    )?.[1] as keyof SensorData | undefined

    if (!sensorKey) return

    const newData = { time: new Date(time), value }
    sensorData.value[sensorKey].push(newData)

    if (sensorData.value[sensorKey].length > MAX_DATA_POINTS) {
      sensorData.value[sensorKey].shift()
    }
  }

  const handleSensorMessage = (message: MqttMessage) => {
    if (message.value !== null) {
      addDataPoint(message.topic, message.value, message.time)
      return true
    }
    return false
  }

  const loadFromDashboard = (dashboardSensors: Partial<SensorData> | undefined) => {
    sensorData.value = {
      co2: processSensorData(dashboardSensors?.co2 || []),
      co: processSensorData(dashboardSensors?.co || []),
      temp: processSensorData(dashboardSensors?.temp || []),
      hum: processSensorData(dashboardSensors?.hum || []),
      voc: processSensorData(dashboardSensors?.voc || []),
      pressure: processSensorData(dashboardSensors?.pressure || []),
      temperature_bmp: processSensorData(dashboardSensors?.temperature_bmp || []),
      pm1: processSensorData(dashboardSensors?.pm1 || []),
      pm25: processSensorData(dashboardSensors?.pm25 || []),
      pm4: processSensorData(dashboardSensors?.pm4 || []),
      pm10: processSensorData(dashboardSensors?.pm10 || []),
      eco2: processSensorData(dashboardSensors?.eco2 || []),
      tvoc: processSensorData(dashboardSensors?.tvoc || []),
      temp_sht: processSensorData(dashboardSensors?.temp_sht || []),
      hum_sht: processSensorData(dashboardSensors?.hum_sht || []),
    }
  }

  const getSensorHistory = (type: string) => {
    const typeMap: Record<string, keyof SensorData> = {
      co2: 'co2',
      temperature: 'temp',
      humidity: 'hum',
      temp: 'temp',
      hum: 'hum',
      voc: 'voc',
      pressure: 'pressure',
      temperature_bmp: 'temperature_bmp',
    }
    const dataKey = typeMap[type] || type
    return sensorData.value[dataKey as keyof SensorData] || []
  }

  return {
    sensorData: sensorData as Ref<SensorData>,
    handleSensorMessage,
    loadFromDashboard,
    getSensorHistory,
  }
}
