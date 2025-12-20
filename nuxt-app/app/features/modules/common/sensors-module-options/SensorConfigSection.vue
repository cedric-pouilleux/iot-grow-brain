<template>
  <div class="col-span-6 lg:col-span-3 flex flex-col space-y-3">
    <h3 class="text-[13px] text-gray-500 dark:text-white">Configuration des Capteurs</h3>
    
    <div class="bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
      <HardwareSensorRow
        v-for="sensor in hardwareSensorList"
        :key="sensor.hardwareKey"
        :hardware="sensor"
        :moduleId="moduleId"
        :sensorHistoryMap="sensorHistoryMap"
      />
      
      <!-- Empty State --> 
      <div v-if="hardwareSensorList.length === 0" class="p-4 text-center text-xs text-gray-400">
        Aucun capteur détecté
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import HardwareSensorRow from '~/components/HardwareSensorRow.vue'
import { HARDWARE_SENSORS } from './config/hardwareSensors'
import type { DeviceStatus, SensorDataPoint } from '../types'

interface Measurement {
  key: string
  label: string
  status: 'ok' | 'missing' | 'unknown'
  value?: number
}

interface HardwareData {
  hardwareKey: string
  name: string
  measurements: Measurement[]
  interval: number
  status: 'ok' | 'partial' | 'missing'
}

interface Props {
  deviceStatus: DeviceStatus | null
  moduleId: string
  sensorHistoryMap?: Record<string, SensorDataPoint[]>
}

const props = defineProps<Props>()

// Get unit for a sensor key
const getUnit = (key: string): string => {
  const k = key.toLowerCase()
  if (k.includes('temp')) return '°C'
  if (k.includes('hum')) return '%'
  if (k.includes('pressure') || k.includes('pression')) return 'hPa'
  if (k === 'co2' || k === 'eco2') return 'ppm'
  if (k === 'co') return 'ppm'
  if (k === 'tvoc') return 'ppb'
  if (k === 'voc') return ''
  if (k.includes('pm')) return 'µg/m³'
  return ''
}

// Build hardware sensor list from device status
const hardwareSensorList = computed<HardwareData[]>(() => {
  const sensors = props.deviceStatus?.sensors
  const sensorsConfig = props.deviceStatus?.sensorsConfig?.sensors
  if (!sensors) return []
  
  return HARDWARE_SENSORS
    .map(hw => {
      // Check if any measurement from this hardware exists
      const measurements: Measurement[] = hw.measurements
        .map(measureKey => {
          const sensorData = sensors[measureKey]
          return {
            key: measureKey,
            label: hw.measurementLabels[measureKey] || measureKey,
            value: sensorData?.value,
            status: (sensorData?.status === 'ok' ? 'ok' : 'missing') as 'ok' | 'missing' | 'unknown'
          }
        })
      
      // Determine overall status
      const okCount = measurements.filter(m => m.status === 'ok').length
      let status: 'ok' | 'partial' | 'missing' = 'missing'
      if (okCount === measurements.length) status = 'ok'
      else if (okCount > 0) status = 'partial'
      
      // Get interval from sensorsConfig (first measurement key)
      const firstKey = hw.measurements[0]
      const intervalMs = sensorsConfig?.[firstKey]?.interval || 60
      
      return {
        hardwareKey: hw.hardwareKey,
        name: hw.name,
        measurements,
        interval: intervalMs,
        status
      }
    })
})
</script>
