<template>
  <!--
    UnifiedSensorCard.vue
    =====================
    Compact sensor card displaying:
    - Title with sensor selector (for groups with multiple sensors)
    - Main value with unit and status indicator
    - Mini chart with history data
    
    Interval config and time counter moved to ModuleOptionsPanel.
  -->
  <div
    class="relative rounded-lg group/card bg-white border border-gray-100 shadow-sm hover:shadow-md flex flex-col justify-between"
  >
    <!-- Header: Title + Sensor Selector -->
    <div class="pl-2 pb-0">
      <div class="flex justify-between items-center h-[30px]">
        <div class="flex items-center">
           <span class="text-gray-500 text-[12px]">{{ currentTitle }}</span>
        </div>

        <div class="flex items-center">
           <!-- Sensor Selection Dropdown (for multi-sensor groups) -->
           <AppDropdown
             v-if="sensors.length > 1"
             :id="`sensor-list-${moduleId}-${sensors[0]?.key || 'default'}`"
             position="static"
             dropdown-class="top-[30px] left-0 w-full bg-gray-800 rounded-b-lg rounded-t-none shadow-xl overflow-hidden text-sm"
           >
             <template #trigger="{ isOpen, toggle }">
               <button 
                 @click.stop="toggle"
                 class="p-1 hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                 :class="{'text-white bg-gray-800 hover:bg-gray-800 hover:text-white rounded-tr-lg': isOpen}"
                 title="Changer de capteur"
               >
                 <Icon name="tabler:list" class="w-4 h-4" />
               </button>
             </template>

             <template #content="{ close }">
               <div class="max-h-48 overflow-y-auto">  
                 <button
                   v-for="sensor in sensors"
                   :key="sensor.key"
                   @click="selectSensor(sensor.key, close)"
                   class="w-full text-left p-2 rounded flex items-center justify-between transition-colors"
                   :class="activeSensorKey === sensor.key ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'"
                 >
                   <span class="text-xs">
                     {{ getDropdownItemLabel(sensor) }}
                   </span>
                   <div class="flex items-center gap-2">
                      <span class="font-bold font-mono text-xs">{{ formatSensorValue(sensor.value) }}<span class="text-xs font-normal text-gray-400">{{ getUnit(sensor.key) }}</span></span>
                      <Icon 
                        :name="getSensorStatus(sensor).icon"
                        class="w-3 h-3" 
                        :class="getSensorStatus(sensor).color"
                      />
                   </div>
                 </button>
               </div>
             </template>
           </AppDropdown>
        </div>
      </div>

      <!-- Main Value Display -->
      <div class="flex items-baseline gap-1">
        <span class="text-3xl font-bold tracking-tight" :class="valueColorClass">
          {{ formattedValue }}
        </span>
        <span class="text-sm font-medium text-gray-400">{{ unit }}</span>
        
        <!-- Status Indicator -->
        <div 
          class="ml-auto p-1 cursor-help"
          :title="statusTooltip"
        >
          <Icon
            :name="statusIcon"
            class="w-3 h-3"
            :class="statusColor"
          />
        </div>
      </div>
    </div>

    <!-- Graph Area -->
    <div class="h-[92px] w-full relative mt-2 rounded-b-lg overflow-hidden group-hover/card:bg-gray-50/30 transition-colors">
      <!-- Loading overlay -->
      <div v-if="isLoading" class="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
        <div class="animate-spin w-5 h-5 border-2 border-gray-300 border-t-emerald-500 rounded-full"></div>
      </div>

      <!-- Maximize Graph Button -->
      <button 
        @click.stop="$emit('toggle-graph')"
        class="absolute bottom-1 right-1 p-1.5 text-gray-600 hover:text-blue-600 hover:bg-white/80 rounded transition-colors z-20 opacity-0 group-hover/card:opacity-100"
        title="Agrandir le graphique"
      >
        <Icon name="tabler:arrows-maximize" class="w-4 h-4" />
      </button>

      <ClientOnly>
        <Line v-if="chartData" :data="chartData" :options="chartOptions" />
        <div v-else class="h-full flex items-center justify-center text-[10px] text-gray-300">
          Pas d'historique
        </div>
      </ClientOnly>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * UnifiedSensorCard
 * 
 * Displays a sensor group's data in a compact card format.
 * 
 * Features:
 * - Multi-sensor selector (for groups like Temperature with DHT, BMP, SHT)
 * - Main value display with status indicator
 * - Mini history chart
 * 
 * Note: Interval configuration moved to ModuleOptionsPanel.
 */
import { ref, computed, watch } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  TimeScale,
  Filler,
} from 'chart.js'
import 'chartjs-adapter-date-fns'
import type { ChartData, ChartOptions } from 'chart.js'
import type { SensorDataPoint } from '../types'
import { formatValue } from '../utils/format'
import AppDropdown from './AppDropdown.vue'

// ============================================================================
// ChartJS Registration
// ============================================================================

if (process.client) {
  ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, TimeScale, Filler)
}

// ============================================================================
// Types
// ============================================================================

interface SensorItem {
  key: string
  label: string
  value?: number
  status?: string
  model?: string
}

interface Props {
  label: string
  sensors: SensorItem[]
  historyMap: Record<string, SensorDataPoint[]>
  moduleId: string
  color: string
  isLoading?: boolean
  initialActiveSensorKey?: string
  graphDuration?: string
}

// ============================================================================
// Props & Emits
// ============================================================================

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
  graphDuration: '24h',
})

defineEmits(['toggle-graph'])

// ============================================================================
// State
// ============================================================================

const activeSensorKey = ref(props.initialActiveSensorKey || props.sensors[0]?.key)

// Ensure valid sensor key
if (!props.sensors.find(s => s.key === activeSensorKey.value)) {
  activeSensorKey.value = props.sensors[0]?.key
}

// ============================================================================
// Persist Sensor Selection
// ============================================================================

watch(activeSensorKey, async (newVal) => {
  if (process.client && newVal) {
    try {
      const prefKey = `sensor-pref-${props.label}`
      await $fetch(`/api/modules/${props.moduleId}/preferences`, {
        method: 'PATCH',
        body: { [prefKey]: newVal }
      })
    } catch (e) {
      console.error('Failed to save preference', e)
    }
  }
})

// ============================================================================
// Computed: Active Sensor
// ============================================================================

const activeSensor = computed(() => 
  props.sensors.find(s => s.key === activeSensorKey.value) || props.sensors[0]
)

const activeHistory = computed(() => 
  props.historyMap[activeSensorKey.value] || []
)

// ============================================================================
// Actions
// ============================================================================

const selectSensor = (key: string, closeFn?: () => void) => {
  activeSensorKey.value = key
  if (closeFn) closeFn()
}

// ============================================================================
// Formatters
// ============================================================================

const formatSensorValue = (val?: number) => formatValue(val)
const formattedValue = computed(() => formatSensorValue(activeSensor.value?.value))

const valueColorClass = computed(() => {
  const map: Record<string, string> = {
    emerald: 'text-emerald-600',
    orange: 'text-orange-500',
    blue: 'text-blue-500',
    violet: 'text-violet-500',
    pink: 'text-pink-500',
    cyan: 'text-cyan-500',
    gray: 'text-gray-400',
  }
  return map[props.color] || 'text-gray-800'
})

// ============================================================================
// Title Logic
// ============================================================================

const currentTitle = computed(() => {
  if (props.sensors.length <= 1) return props.label
  
  // COV group: show sensor label directly
  if ((props.label === 'COV' || props.label === 'TCOV') && activeSensor.value?.label) {
    return activeSensor.value.label
  }

  // Temperature/Humidity: keep simple group label
  if (props.label === 'Température' || props.label === 'Humidité') {
    return props.label
  }

  // Other groups: show "Group (Sensor)"
  if (activeSensor.value?.label && activeSensor.value.label !== props.label) {
    return `${props.label} (${activeSensor.value.label})`
  }
  
  return activeSensor.value?.label || props.label
})

const getDropdownItemLabel = (sensor: SensorItem) => {
  if (props.label === 'Particules fines') return sensor.label
  if (props.label === 'Température' || props.label === 'Humidité') {
    return sensor.model || sensor.label
  }
  return sensor.label + (sensor.model ? ` (${sensor.model})` : '')
}

// ============================================================================
// Unit Helper
// ============================================================================

const getUnit = (sensorKey: string) => {
  if (!sensorKey) return ''
  const k = sensorKey.toLowerCase()
  
  if (k.includes('temp')) return '°C'
  if (k.includes('hum')) return '%'
  if (k.includes('pressure') || k.includes('pression')) return 'hPa'
  if (k === 'co2' || k === 'eco2') return 'ppm'
  if (k === 'tvoc') return 'ppb'
  if (k === 'voc') return ''
  if (k.includes('pm')) return 'µg/m³'
  
  return ''
}

const unit = computed(() => activeSensor.value ? getUnit(activeSensor.value.key) : '')

// ============================================================================
// Status Display
// ============================================================================

const getSensorStatus = (sensor: SensorItem) => {
  if (sensor.status === 'ok') return { icon: 'tabler:circle-check-filled', color: 'text-green-500', text: 'OK' }
  if (sensor.status === 'missing') return { icon: 'tabler:circle-x-filled', color: 'text-red-500', text: 'Manquant' }
  if (sensor.value === undefined || sensor.value === null) return { icon: 'tabler:help-circle-filled', color: 'text-gray-300', text: 'No Data' }
  return { icon: 'tabler:circle-check-filled', color: 'text-green-500', text: 'OK' }
}

const currentStatus = computed(() => getSensorStatus(activeSensor.value))
const statusIcon = computed(() => currentStatus.value.icon)
const statusColor = computed(() => currentStatus.value.color)
const statusTooltip = computed(() => {
  const model = activeSensor.value?.model || activeSensor.value?.label || 'Capteur'
  return `${model}: ${currentStatus.value.text}`
})

// ============================================================================
// Chart Configuration
// ============================================================================

const colorMap: Record<string, string> = {
  emerald: '#10b981',
  orange: '#f97316',
  blue: '#3b82f6',
  violet: '#8b5cf6',
  pink: '#ec4899',
  cyan: '#06b6d4',
  gray: '#9ca3af',
}

const strokeColor = computed(() => colorMap[props.color] || colorMap.gray)

const chartData = computed<ChartData<'line'> | null>(() => {
  const history = activeHistory.value
  if (!history || history.length < 2) return null

  // Filter based on duration
  const now = Date.now()
  let durationMs = 24 * 60 * 60 * 1000
  if (props.graphDuration === '1h') durationMs = 1 * 60 * 60 * 1000
  if (props.graphDuration === '6h') durationMs = 6 * 60 * 60 * 1000
  if (props.graphDuration === '12h') durationMs = 12 * 60 * 60 * 1000
  if (props.graphDuration === '7j') durationMs = 7 * 24 * 60 * 60 * 1000

  const cutoff = now - durationMs
  const filteredData = history.filter(d => new Date(d.time).getTime() > cutoff)

  if (filteredData.length < 2) return null

  const sortedData = [...filteredData].sort((a, b) => 
    new Date(a.time).getTime() - new Date(b.time).getTime()
  )

  // Gap detection for dashed lines
  const gapIndices = new Set<number>()
  const timeGaps = []
  for (let i = 1; i < sortedData.length; i++) {
    timeGaps.push(new Date(sortedData[i].time).getTime() - new Date(sortedData[i-1].time).getTime())
  }
  const medianGap = timeGaps.length ? timeGaps.sort((a,b) => a-b)[Math.floor(timeGaps.length/2)] : 60000
  const gapThreshold = Math.max(medianGap * 5, 10 * 60 * 1000)

  for (let i = 1; i < sortedData.length; i++) {
    if (new Date(sortedData[i].time).getTime() - new Date(sortedData[i-1].time).getTime() > gapThreshold) {
      gapIndices.add(i - 1)
    }
  }

  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  return {
    datasets: [{
      label: props.label,
      backgroundColor: hexToRgba(strokeColor.value, 0.1),
      borderColor: strokeColor.value,
      borderWidth: 2,
      data: sortedData.map(m => ({ x: new Date(m.time).getTime(), y: m.value })),
      tension: 0.2,
      fill: 'start',
      pointRadius: 0,
      segment: {
        borderDash: (ctx: any) => gapIndices.has(ctx.p0DataIndex) ? [4, 4] : undefined,
        borderColor: (ctx: any) => gapIndices.has(ctx.p0DataIndex) ? hexToRgba(strokeColor.value, 0.3) : undefined
      }
    }]
  }
})

const chartOptions = computed<ChartOptions<'line'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { intersect: false },
  scales: {
    x: { type: 'time', display: false },
    y: { display: false }
  },
  plugins: { legend: { display: false }, tooltip: { enabled: false } }
}))
</script>
