<template>
  <!-- 
    ModuleOptionsPanel.vue
    =====================
    Collapsible panel for module configuration, displayed between header and sensor cards.
    
    Left section: Device info (hardware, network, storage)
    Right section: Hardware sensors list with measurements and interval sliders
    
    Sensors are grouped by physical hardware (e.g., BMP280, DHT22, SPS30)
    with one interval control per hardware sensor.
  -->
  <Transition name="slide">
    <div 
      v-if="isOpen" 
      class="overflow-hidden"   
    >
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        
        <!-- LEFT SECTION: Device Info (all in one block) -->
        <div class="space-y-3">
          <!-- Hardware + Network Info -->
          <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div class="flex justify-between">
              <span class="text-gray-400">Modèle</span>
              <span class="text-gray-700 font-medium">{{ hardwareModel }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-400">IP</span>
              <span class="text-gray-700 font-medium font-mono">{{ deviceStatus?.system?.ip || '--' }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-400">CPU</span>
              <span class="text-gray-700 font-medium">{{ cpuFreq }} MHz</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-400">MAC</span>
              <span class="text-gray-700 font-medium font-mono text-[10px]">{{ deviceStatus?.system?.mac || '--' }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-400">Uptime</span>
              <span class="text-gray-700 font-medium">{{ formattedUptime }}</span>
            </div>
          </div>

          <!-- Storage Bars -->
          <div class="space-y-2">
            <!-- Flash Bar -->
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-400 w-10">Flash</span>
              <div class="flex-1 h-4 bg-gray-100 rounded-sm overflow-hidden flex border border-gray-200" :title="flashTooltip">
                <div 
                  v-if="flashPercentages.sketchPercent > 0"
                  class="bg-gray-200 h-full flex items-center justify-center border-r border-gray-300" 
                  :style="{ width: flashPercentages.sketchPercent + '%' }"
                >
                  <span v-if="flashPercentages.sketchPercent > 15" class="text-[8px] text-gray-600 font-medium">Sketch</span>
                </div>
                <div 
                  v-if="flashPercentages.otaPercent > 0"
                  class="bg-gray-300 h-full flex items-center justify-center border-r border-gray-400" 
                  :style="{ width: flashPercentages.otaPercent + '%' }"
                >
                  <span v-if="flashPercentages.otaPercent > 10" class="text-[8px] text-gray-600 font-medium">OTA</span>
                </div>
                <div 
                  v-if="flashPercentages.systemPercent > 0"
                  class="bg-gray-400 h-full flex items-center justify-center" 
                  :style="{ width: flashPercentages.systemPercent + '%' }"
                >
                  <span v-if="flashPercentages.systemPercent > 8" class="text-[8px] text-gray-100 font-medium">Sys</span>
                </div>
              </div>
              <span class="text-[10px] text-gray-500 w-20 text-right">{{ formatKb(flashPercentages.totalUsedKb) }} / {{ formatKb(flashTotalKb) }}</span>
            </div>
            <!-- RAM Bar -->
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-400 w-10">RAM</span>
              <div class="flex-1 h-4 bg-gray-100 rounded-sm overflow-hidden flex border border-gray-200" :title="ramTooltip">
                <div 
                  class="bg-gray-300 h-full flex items-center justify-center" 
                  :style="{ width: ramUsedPercent + '%' }"
                >
                  <span v-if="ramUsedPercent > 20" class="text-[8px] text-gray-600 font-medium">{{ ramUsedPercent }}%</span>
                </div>
              </div>
              <span class="text-[10px] text-gray-500 w-20 text-right">{{ formatKb(ramPercentages.usedKb) }} / {{ formatKb(ramTotalKb) }}</span>
            </div>
          </div>
        </div>

        <!-- RIGHT SECTION: Hardware Sensors List -->
        <div class="space-y-4">
          <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Configuration des Capteurs
          </h3>
          
          <div class="bg-white rounded-lg shadow-sm border border-gray-100 divide-y divide-gray-100">
            <HardwareSensorRow
              v-for="hw in hardwareSensorList"
              :key="hw.hardwareKey"
              :hardware="hw"
              :module-id="moduleId"
              :sensor-history-map="sensorHistoryMap"
            />
            
            <!-- Empty State -->
            <div v-if="hardwareSensorList.length === 0" class="p-4 text-center text-xs text-gray-400">
              Aucun capteur détecté
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
/**
 * ModuleOptionsPanel
 * 
 * A collapsible panel that displays device information and sensor configuration.
 * Sensors are grouped by physical hardware (BMP280, DHT22, SPS30, etc.)
 */
import { computed } from 'vue'
import type { DeviceStatus, SensorDataPoint } from '../types'
import { getHardwareModel } from '../utils/hardware'
import { useStorageCalculations } from '../composables/useStorageCalculations'
import HardwareSensorRow from './HardwareSensorRow.vue'

// ============================================================================
// Props
// ============================================================================

interface Props {
  isOpen: boolean
  deviceStatus: DeviceStatus | null
  moduleId: string
  formattedUptime: string
  sensorHistoryMap?: Record<string, SensorDataPoint[]>
}

const props = withDefaults(defineProps<Props>(), {
  sensorHistoryMap: () => ({})
})

// ============================================================================
// Computed: Device Info
// ============================================================================

const deviceStatusRef = computed(() => props.deviceStatus)
const { flashPercentages, ramPercentages } = useStorageCalculations(deviceStatusRef)

const hardwareModel = computed(() => 
  getHardwareModel(props.deviceStatus?.hardware?.chip)
)

const cpuFreq = computed(() => 
  props.deviceStatus?.hardware?.chip?.cpuFreqMhz || '--'
)

const flashUsedPercent = computed(() => {
  const { sketchPercent, otaPercent, systemPercent } = flashPercentages.value
  return Math.round(sketchPercent + otaPercent + systemPercent)
})

const ramUsedPercent = computed(() => 
  Math.round(ramPercentages.value.usedPercent)
)

const flashTooltip = computed(() => {
  const { sketchPercent, otaPercent, systemPercent, freePercent } = flashPercentages.value
  return `Sketch: ${Math.round(sketchPercent)}% | OTA: ${Math.round(otaPercent)}% | Sys: ${Math.round(systemPercent)}% | Libre: ${Math.round(freePercent)}%`
})

const ramTooltip = computed(() => {
  const { usedPercent, freePercent } = ramPercentages.value
  return `Utilisé: ${Math.round(usedPercent)}% | Libre: ${Math.round(freePercent)}%`
})

// Storage size helpers
const flashTotalKb = computed(() => {
  const flash = props.deviceStatus?.hardware?.flash
  return flash?.size ? Math.round(flash.size / 1024) : 0
})

const ramTotalKb = computed(() => {
  const heap = props.deviceStatus?.hardware?.heap
  return heap?.total ? Math.round(heap.total / 1024) : 0
})

const formatKb = (kb: number | undefined): string => {
  if (!kb || kb === 0) return '--'
  if (kb >= 1024) return `${(kb / 1024).toFixed(1)}MB`
  return `${Math.round(kb)}KB`
}

// ============================================================================
// Hardware Grouping Definition
// ============================================================================

/**
 * Mapping of physical hardware sensors to their measurement types.
 * Each hardware sensor reads multiple values simultaneously.
 */
const HARDWARE_SENSORS = [
  {
    hardwareKey: 'mhz14a',
    name: 'MH-Z14A',
    measurements: ['co2'],
    measurementLabels: { co2: 'CO2' }
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
    name: 'SHT30',
    measurements: ['temp_sht', 'hum_sht'],
    measurementLabels: { temp_sht: 'Temp', hum_sht: 'Hum' }
  },
  {
    hardwareKey: 'sps30',
    name: 'SPS30',
    measurements: ['pm1', 'pm25', 'pm4', 'pm10'],
    measurementLabels: { pm1: 'PM1', pm25: 'PM2.5', pm4: 'PM4', pm10: 'PM10' }
  },
] as const

// ============================================================================
// Computed: Hardware Sensor List
// ============================================================================

export interface HardwareSensorItem {
  hardwareKey: string
  name: string
  measurements: Array<{
    key: string
    label: string
    status: 'ok' | 'missing' | 'unknown'
    value?: number
  }>
  interval: number
  status: 'ok' | 'partial' | 'missing'
}

const hardwareSensorList = computed<HardwareSensorItem[]>(() => {
  const sensors = props.deviceStatus?.sensors || {}
  const config = props.deviceStatus?.sensorsConfig?.sensors || {}
  
  const list: HardwareSensorItem[] = []
  
  for (const hw of HARDWARE_SENSORS) {
    // Check if any measurement from this hardware exists
    const measurements = hw.measurements.map(key => {
      const sensorStatus = sensors[key]
      const exists = sensorStatus !== undefined
      
      return {
        key,
        label: hw.measurementLabels[key as keyof typeof hw.measurementLabels],
        status: !exists ? 'unknown' as const
              : sensorStatus?.status === 'ok' ? 'ok' as const
              : sensorStatus?.status === 'missing' ? 'missing' as const
              : 'unknown' as const,
        value: sensorStatus?.value
      }
    }).filter(m => m.status !== 'unknown' || sensors[m.key] !== undefined)
    
    // Skip hardware with no detected measurements
    const activeMeasurements = measurements.filter(m => 
      sensors[m.key] !== undefined
    )
    if (activeMeasurements.length === 0) continue
    
    // Determine overall hardware status
    const okCount = activeMeasurements.filter(m => m.status === 'ok').length
    const hwStatus = okCount === activeMeasurements.length ? 'ok'
                   : okCount === 0 ? 'missing'
                   : 'partial'
    
    // Get interval from first measurement's config
    const firstKey = hw.measurements[0]
    const interval = config[firstKey]?.interval || 60
    
    list.push({
      hardwareKey: hw.hardwareKey,
      name: hw.name,
      measurements: activeMeasurements,
      interval,
      status: hwStatus as 'ok' | 'partial' | 'missing'
    })
  }
  
  return list
})
</script>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease-out;
  max-height: 500px;
}

.slide-enter-from,
.slide-leave-to {
  max-height: 0;
  opacity: 0;
  padding-top: 0;
  padding-bottom: 0;
}
</style>
