<template>
  <div
    class="relative rounded-lg group/card bg-white border border-gray-100 shadow-sm hover:shadow-md flex flex-col justify-between"
  >
    <!-- Header with Label, Main Value, and Controls -->
    <div class="pl-3 pb-0">
      <div class="flex justify-between items-center">
        <div class="flex items-center">
           <!-- Title -->
           <span class="text-gray-500">{{ currentTitle }}</span>
        </div>

        <div class="flex items-center">
           <!-- Sensor Selection Dropdown -->
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
                 :class="{'text-white bg-gray-800 hover:bg-gray-800 hover:text-white': isOpen}"
                 title="Changer de capteur"
               >
                 <Icon name="tabler:list" class="w-4 h-4" />
               </button>
             </template>

             <template #content="{ close }">
               <div class="max-h-48 overflow-y-auto p-2 space-y-1">
                 <button
                   v-for="sensor in sensors"
                   :key="sensor.key"
                   @click="selectSensor(sensor.key, close)"
                   class="w-full text-left px-3 py-2 rounded flex items-center justify-between transition-colors"
                   :class="activeSensorKey === sensor.key ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'"
                 >
                   <span class="font-medium text-xs">{{ sensor.model || sensor.label }}</span>
                   <div class="flex items-center gap-2">
                      <span class="font-bold font-mono text-xs">{{ formatSensorValue(sensor.value) }}</span>
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

           <!-- Status Indicator -->
           <div 
             class="p-1 transition-colors"
             :title="statusTooltip"
           >
              <Icon
               :name="statusIcon"
               class="w-4 h-4"
               :class="statusColor"
             />
           </div>
        </div>
      </div>

      <!-- Main Value Display -->
      <div class="flex items-baseline gap-1">
        <span class="text-3xl font-bold tracking-tight" :class="valueColorClass">
          {{ formattedValue }}
        </span>
        <span class="text-sm font-medium text-gray-400">{{ unit }}</span>
        
        <!-- Active Sensor Label (if multiple) -->
        <span v-if="sensors.length > 1" class="ml-auto text-[10px] text-gray-400 font-medium bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
          {{ activeSensorLabel }}
        </span>
      </div>
      
      <!-- Footer: Time Ago & Interval -->
      <div v-if="timeAgo || sensors.length > 0" class="mt-1">
        <ModuleIntervalDropdown
          :initial-interval="currentInterval"
          :module-id="moduleId"
          :sensor-keys="allSensorKeys"
          class="w-full z-[70]"
        >
            <template #trigger="{ isOpen }">
                <div 
                    class="flex items-center gap-1.5 px-2 py-1 -ml-2 rounded-t-md cursor-pointer transition-colors relative"
                    :class="isOpen ? 'bg-gray-800 text-white' : 'group hover:bg-gray-50'"
                >
                    <Icon 
                        name="tabler:clock" 
                        class="w-3 h-3 transition-colors" 
                        :class="isOpen ? 'text-gray-300' : 'text-gray-300 group-hover:text-gray-500'" 
                    />
                    <span 
                        class="text-[10px] font-medium transition-colors"
                        :class="isOpen ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'"
                    >
                        {{ timeAgo || 'Config' }}
                    </span>
                </div>
            </template>
        </ModuleIntervalDropdown>
      </div>
    </div>

    <!-- Graph Area -->
    <div class="h-[92px] w-full relative mt-2 rounded-b-lg overflow-hidden group-hover/card:bg-gray-50/30 transition-colors">
      <!-- Loading overlay -->
      <div v-if="isLoading" class="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
        <div class="animate-spin w-5 h-5 border-2 border-gray-300 border-t-emerald-500 rounded-full"></div>
      </div>

      <!-- Maximize Graph Button (Bottom Right) -->
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
import { ref, computed } from 'vue'
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
import ModuleIntervalDropdown from './ModuleIntervalDropdown.vue'
import { useTimeAgo } from '../composables/useTimeAgo'

// Register ChartJS
if (process.client) {
  ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, TimeScale, Filler)
}

interface SensorItem {
  key: string
  label: string
  value?: number
  status?: string // 'ok', 'missing', etc.
  model?: string
  interval?: number
}

interface Props {
  label: string
  sensors: SensorItem[]
  historyMap: Record<string, SensorDataPoint[]> // key -> history
  moduleId: string
  color: string // 'emerald', 'orange', etc.
  isLoading?: boolean
  initialActiveSensorKey?: string
  graphDuration?: string
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
  graphDuration: '24h',
})

defineEmits(['toggle-graph'])

const activeSensorKey = ref(props.initialActiveSensorKey || props.sensors[0]?.key)

// Ensure activeSensorKey is valid
if (!props.sensors.find(s => s.key === activeSensorKey.value)) {
  activeSensorKey.value = props.sensors[0]?.key
}

const activeSensor = computed(() => 
  props.sensors.find(s => s.key === activeSensorKey.value) || props.sensors[0]
)

const activeHistory = computed(() => 
  props.historyMap[activeSensorKey.value] || []
)

// Actions
const selectSensor = (key: string, closeFn?: () => void) => {
  activeSensorKey.value = key
  if (closeFn) closeFn()
}

// Formatters
const formatSensorValue = (val?: number) => formatValue(val)
const formattedValue = computed(() => formatSensorValue(activeSensor.value?.value))

const activeSensorLabel = computed(() => 
  activeSensor.value?.label === props.label ? activeSensor.value?.model || 'Principal' : activeSensor.value?.label
)

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

// Interval Logic
const allSensorKeys = computed(() => props.sensors.map(s => s.key))
const currentInterval = computed(() => {
  // Use the interval of active sensor or first valid found
  if (activeSensor.value?.interval) return activeSensor.value.interval
  const s = props.sensors.find(s => s.interval)
  return s?.interval || 60
})

// Time Ago
const timeAgo = useTimeAgo(() => {
  if (!activeHistory.value || activeHistory.value.length === 0) return null
  const lastItem = activeHistory.value[activeHistory.value.length - 1]
  return lastItem.time
})

const currentTitle = computed(() => {
  if (props.sensors.length <= 1) return props.label
  return activeSensor.value?.label || props.label
})

// Unit deduction
const unit = computed(() => {
  if (!activeSensor.value) return ''
  const k = activeSensor.value.key.toLowerCase()
  
  if (k.includes('temp')) return '°C'
  if (k.includes('hum')) return '%'
  if (k.includes('pressure') || k.includes('pression')) return 'hPa'
  if (k === 'co2' || k === 'eco2') return 'ppm'
  if (k === 'tvoc') return 'ppb'
  if (k === 'voc') return '' // COV Index (no unit)
  if (k.includes('pm')) return 'µg/m³'
  
  return ''
})

// Status Logic
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

// Chart Logic
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
  let durationMs = 24 * 60 * 60 * 1000 // default 24h
  if (props.graphDuration === '1h') durationMs = 1 * 60 * 60 * 1000
  if (props.graphDuration === '6h') durationMs = 6 * 60 * 60 * 1000
  if (props.graphDuration === '12h') durationMs = 12 * 60 * 60 * 1000
  // 24h is default
  if (props.graphDuration === '7j') durationMs = 7 * 24 * 60 * 60 * 1000

  const cutoff = now - durationMs
  
  const filteredData = history.filter(d => new Date(d.time).getTime() > cutoff)

  if (filteredData.length < 2) return null

  const sortedData = [...filteredData].sort((a, b) => {
    const timeA = new Date(a.time).getTime()
    const timeB = new Date(b.time).getTime()
    return timeA - timeB
  })

  // Gap detection
  const gapIndices = new Set<number>()
  const timeGaps = []
  for (let i = 1; i < sortedData.length; i++) {
     timeGaps.push(new Date(sortedData[i].time).getTime() - new Date(sortedData[i-1].time).getTime())
  }
  const medianGap = timeGaps.length ? timeGaps.sort((a,b)=>a-b)[Math.floor(timeGaps.length/2)] : 60000
  const gapThreshold = Math.max(medianGap * 5, 10 * 60 * 1000)

  for(let i=1; i<sortedData.length; i++) {
    if (new Date(sortedData[i].time).getTime() - new Date(sortedData[i-1].time).getTime() > gapThreshold) {
      gapIndices.add(i-1)
    }
  }

  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  return {
    datasets: [
      {
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
      }
    ]
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
