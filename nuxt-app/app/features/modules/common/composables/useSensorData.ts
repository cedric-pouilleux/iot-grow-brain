import type { SensorData } from '../types'
import type { MqttMessage } from '~/types'
import { processSensorData } from '~/utils/data-processing'
import { SENSORS, type SensorKey } from '../config/sensors'

const MAX_DATA_POINTS = 100

export const useSensorData = () => {
  // Initialize with all canonical sensor keys
  const sensorData = ref<SensorData>(
    Object.keys(SENSORS).reduce((acc, key) => {
      acc[key] = []
      return acc
    }, {} as SensorData)
  )

  const addDataPoint = (topic: string, value: number, time: string) => {
    // Extract sensor key from topic (last part after /)
    const parts = topic.split('/')
    const sensorKey = parts[parts.length - 1]
    
    if (!SENSORS[sensorKey as SensorKey]) return

    const newData = { time: new Date(time), value }
    if (!sensorData.value[sensorKey]) {
      sensorData.value[sensorKey] = []
    }
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
    // Initialize all canonical keys with empty arrays, then merge dashboard data
    const result: SensorData = Object.keys(SENSORS).reduce((acc, key) => {
      acc[key] = processSensorData(dashboardSensors?.[key] || [])
      return acc
    }, {} as SensorData)
    
    sensorData.value = result
  }

  const getSensorHistory = (type: string) => {
    return sensorData.value[type] || []
  }

  return {
    sensorData: sensorData as Ref<SensorData>,
    handleSensorMessage,
    loadFromDashboard,
    getSensorHistory,
  }
}
