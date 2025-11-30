import type { SensorData, MqttMessage } from '../types'
import { processSensorData } from '../utils/data-processing'

const SENSOR_TOPICS = {
  '/co2': 'co2',
  '/temperature': 'temp',
  '/humidity': 'hum'
} as const

const MAX_DATA_POINTS = 100

export const useSensorData = () => {
  const sensorData = ref<SensorData>({ co2: [], temp: [], hum: [] })

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

  const loadFromDashboard = (dashboardSensors: any) => {
    sensorData.value = {
      co2: processSensorData(dashboardSensors?.co2 || []),
      temp: processSensorData(dashboardSensors?.temp || []),
      hum: processSensorData(dashboardSensors?.hum || [])
    }
  }

  const getSensorHistory = (type: string) => {
    const typeMap: Record<string, keyof SensorData> = {
      'co2': 'co2',
      'temperature': 'temp',
      'humidity': 'hum',
      'temp': 'temp',
      'hum': 'hum'
    }
    const dataKey = typeMap[type] || type
    return sensorData.value[dataKey as keyof SensorData] || []
  }

  return {
    sensorData: sensorData as Ref<SensorData>,
    handleSensorMessage,
    loadFromDashboard,
    getSensorHistory
  }
}

