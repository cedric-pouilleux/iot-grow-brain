<template>
  <Transition name="slide-panel">
    <div v-if="selectedSensor" class="mt-5">
      <!-- Panel -->
      <div class="bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        <!-- Header -->
        <div class="px-4 py-2 border-b border-gray-100 dark:border-gray-700 relative z-10">
          <div class="flex items-center justify-between">
            <!-- Title + Sensor chips (grouped together) -->
            <div class="flex items-center gap-3 flex-wrap">
              <!-- Title -->
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full" :style="{ backgroundColor: dynamicColor }"></span>
                <span class="font-semibold text-gray-700 dark:text-white text-sm">{{ dynamicTitle }}</span>
              </div>
              
              <!-- Sensor selector chips -->
              <div v-if="enabledSensors && enabledSensors.length > 1" class="flex flex-wrap gap-1.5">
                <button
                  v-for="(sensor, index) in enabledSensors"
                  :key="sensor.key"
                  @click="toggleSensor(sensor.key)"
                  class="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all cursor-pointer"
                  :class="selectedSensorKeys.has(sensor.key) 
                    ? 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'"
                >
                  <span 
                    class="w-2 h-2 rounded-full" 
                    :style="{ backgroundColor: getSensorShadeColor(index) }"
                  ></span>
                  {{ getSensorDisplayLabel(sensor) }}
                </button>
              </div>
            </div>
            
            <!-- Close button -->
            <button 
              @click="$emit('close')"
              class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors shrink-0 cursor-pointer"
              title="Fermer"
            >
              <Icon name="tabler:x" class="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <!-- Chart -->
        <div class="h-80 w-full relative p-4">
          <ClientOnly>
            <Line v-if="chartData" :data="chartData" :options="chartOptions" />
            <template #fallback>
              <div class="h-full flex items-center justify-center text-[10px] text-gray-300">
                Chargement...
              </div>
            </template>
          </ClientOnly>
          <div v-if="!hasHistory" class="h-full flex items-center justify-center text-gray-400">
            Pas assez de données pour afficher le graphique détaillé.
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import type { SensorDataPoint } from '../types'
import type { ChartData, ChartOptions } from 'chart.js'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  TimeScale,
  Filler,
  Tooltip,
} from 'chart.js'
import { Line } from 'vue-chartjs'
import 'chartjs-adapter-date-fns'
import { getSensorRange, getNormalizationRatio } from '../config/sensors'

if (process.client) {
  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    TimeScale,
    Filler,
    Tooltip
  )
}

interface SensorItem {
  key: string
  label: string
  value?: number
  status?: string
  model?: string
}

interface Props {
  selectedSensor: string | null
  initialActiveSensor?: string | null // Pre-select this sensor from the card
  history: SensorDataPoint[]
  sensorLabel: string
  sensorColor: string
  sensorUnit: string
  availableSensors?: SensorItem[]
  sensorHistoryMap?: Record<string, SensorDataPoint[]>
}

const props = withDefaults(defineProps<Props>(), {
  selectedSensor: null,
  initialActiveSensor: null,
  history: () => [],
  availableSensors: () => [],
  sensorHistoryMap: () => ({}),
})

defineEmits<{
  close: []
}>()

// Color mode detection for grid color
const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')

// Filter out disabled sensors from the chip selector
const enabledSensors = computed(() => 
  (props.availableSensors || []).filter(s => s.status !== 'disabled')
)

// State for multi-sensor selection
const selectedSensorKeys = ref<Set<string>>(new Set())

// Initialize with the active sensor from the card (or fallback to primary sensor)
watch(() => [props.selectedSensor, props.initialActiveSensor] as const, ([selected, initial]) => {
  // Prefer initialActiveSensor from the card, otherwise use selectedSensor
  const sensorToSelect = initial || selected
  if (sensorToSelect) {
    selectedSensorKeys.value = new Set([sensorToSelect])
  }
}, { immediate: true })

// Toggle sensor selection
// VOC/TVOC are exclusive (can't combine different scales)
const exclusiveSensorGroups = [['voc', 'tvoc']]

const toggleSensor = (sensorKey: string) => {
  const parts = sensorKey.split(':')
  const sensorType = parts.length > 1 ? parts[1].toLowerCase() : sensorKey.toLowerCase()
  
  // Check if this sensor belongs to an exclusive group
  const exclusiveGroup = exclusiveSensorGroups.find(group => group.includes(sensorType))
  
  if (exclusiveGroup) {
    // Exclusive selection: replace the current selection with this sensor
    selectedSensorKeys.value = new Set([sensorKey])
    return
  }
  
  // Normal toggle behavior for other sensors
  const newSet = new Set(selectedSensorKeys.value)
  if (newSet.has(sensorKey)) {
    // Don't allow deselecting the last sensor
    if (newSet.size > 1) {
      newSet.delete(sensorKey)
    }
  } else {
    newSet.add(sensorKey)
  }
  selectedSensorKeys.value = newSet
}

// Color shade multipliers for different sensors (index-based)
const shadeMultipliers = [1.0, 0.7, 1.3, 0.5, 1.5] // base, darker, lighter, darkest, lightest

// Get color shade for a sensor based on its index
const getSensorShadeColor = (index: number): string => {
  const baseColor = props.sensorColor
  const multiplier = shadeMultipliers[index % shadeMultipliers.length]
  
  // Parse hex color
  const r = parseInt(baseColor.slice(1, 3), 16)
  const g = parseInt(baseColor.slice(3, 5), 16)
  const b = parseInt(baseColor.slice(5, 7), 16)
  
  // Apply shade multiplier (clamp to 0-255)
  const adjustedR = Math.min(255, Math.max(0, Math.round(r * multiplier)))
  const adjustedG = Math.min(255, Math.max(0, Math.round(g * multiplier)))
  const adjustedB = Math.min(255, Math.max(0, Math.round(b * multiplier)))
  
  return `rgb(${adjustedR}, ${adjustedG}, ${adjustedB})`
}

// Get sensor color by key (for chart datasets)
const getSensorColorByKey = (sensorKey: string): string => {
  const index = props.availableSensors?.findIndex(s => s.key === sensorKey) ?? 0
  return getSensorShadeColor(index)
}

// Get display label for a sensor (PM sensors show their type, others show model)
const getSensorDisplayLabel = (sensor: SensorItem): string => {
  // PM sensors: show the PM type (PM1.0, PM2.5, etc.) instead of the model
  const keyParts = sensor.key.split(':')
  const sensorType = keyParts.length > 1 ? keyParts[1] : sensor.key
  
  if (/^pm\d/.test(sensorType)) {
    return sensor.label
  }
  // Other sensors: prefer model name if available
  return sensor.model || sensor.label
}

// Dynamic title based on sensor type
// Only COV/TVOC sensors have dynamic titles, others use the group label
const dynamicTitle = computed(() => {
  const firstKey = Array.from(selectedSensorKeys.value)[0]
  if (!firstKey) return props.sensorLabel
  
  const parts = firstKey.split(':')
  const keyLower = parts.length > 1 ? parts[1].toLowerCase() : firstKey.toLowerCase()
  
  // COV sensors: show different titles based on active sensor
  if (keyLower === 'tvoc') {
    return 'Composés Organiques Volatils Totaux'
  }
  if (keyLower === 'voc') {
    return 'Composés Organiques Volatils'
  }
  
  // All other sensors (Temperature, Humidity, PM, etc.) use the group label
  return props.sensorLabel
})

// Dynamic color based on selected sensor
// Only changes for COV/TVOC (exclusive selection), otherwise uses the base group color
const dynamicColor = computed(() => {
  const firstKey = Array.from(selectedSensorKeys.value)[0]
  if (!firstKey) return props.sensorColor
  
  // Only COV/TVOC can change color (exclusive selection)
  const parts = firstKey.split(':')
  const keyLower = parts.length > 1 ? parts[1].toLowerCase() : firstKey.toLowerCase()
  
  if (keyLower === 'voc' || keyLower === 'tvoc') {
    return getSensorColorByKey(firstKey)
  }
  
  // All other sensors keep the base group color
  return props.sensorColor
})

const hasHistory = computed(() => props.history && props.history.length >= 2)

const graphMinMax = computed(() => {
  // Use the first selected sensor to determine the range
  const firstKey = Array.from(selectedSensorKeys.value)[0]
  const sensorType = (firstKey || props.selectedSensor)?.toLowerCase() || ''
  const range = getSensorRange(sensorType)
  
  if (range) {
    return range
  }

  // Fallback to dynamic calculation for unknown sensors
  if (!hasHistory.value) return { min: 0, max: 100 }
  const values = props.history.map(d => d.value).filter(v => v !== null && v !== undefined)
  if (values.length === 0) return { min: 0, max: 100 }
  let min = Math.min(...values)
  let max = Math.max(...values)

  const range2 = max - min || 1
  let minWithPadding = min - range2 * 0.1
  let maxWithPadding = max + range2 * 0.1

  return {
    min: minWithPadding,
    max: maxWithPadding,
  }
})

// Configuration Chart.js with multi-sensor support
const chartData = computed<ChartData<'line'> | null>(() => {
  const hexToRgba = (color: string, alpha: number): string => {
    // Handle both hex (#ffffff) and rgb(r, g, b) formats
    if (color.startsWith('#')) {
      const r = parseInt(color.slice(1, 3), 16)
      const g = parseInt(color.slice(3, 5), 16)
      const b = parseInt(color.slice(5, 7), 16)
      return `rgba(${r}, ${g}, ${b}, ${alpha})`
    } else if (color.startsWith('rgb(')) {
      return color.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`)
    }
    return color
  }

  // Check if we have multi-sensor data available
  const hasMultiSensorData = props.availableSensors && 
    props.availableSensors.length > 1 && 
    Object.keys(props.sensorHistoryMap || {}).length > 0

  if (hasMultiSensorData) {
    // Multi-sensor mode: create one dataset per selected sensor
    const datasets = []
    
    for (const sensorKey of selectedSensorKeys.value) {
      const sensorHistory = props.sensorHistoryMap?.[sensorKey]
      if (!sensorHistory || sensorHistory.length < 2) continue
      
      const sensor = props.availableSensors?.find(s => s.key === sensorKey)
      const color = getSensorColorByKey(sensorKey)
      
      // Get normalization ratio for this sensor (e.g., TVOC / 100)
      const ratio = getNormalizationRatio(sensorKey)
      
      const sortedData = [...sensorHistory].sort((a, b) => {
        const timeA = a.time instanceof Date ? a.time.getTime() : new Date(a.time).getTime()
        const timeB = b.time instanceof Date ? b.time.getTime() : new Date(b.time).getTime()
        return timeA - timeB
      })
      
      // Apply normalization ratio to values
      const normalizedData = sortedData.map(m => ({ 
        x: m.time as unknown as number, 
        y: m.value / ratio 
      }))
      
      datasets.push({
        label: sensor ? getSensorDisplayLabel(sensor) : sensorKey,
        backgroundColor: hexToRgba(color, 0.1),
        borderColor: color,
        borderWidth: 2,
        data: normalizedData,
        tension: 0.2,
        fill: false, // No fill for multi-line to avoid overlap
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBorderWidth: 2,
        pointHoverBackgroundColor: '#ffffff',
        pointHoverBorderColor: color,
        hitRadius: 8,
        spanGaps: true,
      })
    }
    
    if (datasets.length === 0) return null
    return { datasets }
  }

  // Fallback: single sensor mode (original behavior)
  if (!hasHistory.value) return null

  const sortedData = [...props.history].sort((a, b) => {
    const timeA = a.time instanceof Date ? a.time.getTime() : new Date(a.time).getTime()
    const timeB = b.time instanceof Date ? b.time.getTime() : new Date(b.time).getTime()
    return timeA - timeB
  })

  // Calculate average time gap to detect significant gaps
  const timeGaps: number[] = []
  for (let i = 1; i < sortedData.length; i++) {
    const t1 = sortedData[i-1].time instanceof Date ? sortedData[i-1].time.getTime() : new Date(sortedData[i-1].time).getTime()
    const t2 = sortedData[i].time instanceof Date ? sortedData[i].time.getTime() : new Date(sortedData[i].time).getTime()
    timeGaps.push(t2 - t1)
  }
  
  // Gap threshold: 5x the median gap (or 10 min minimum)
  const medianGap = timeGaps.length > 0 ? timeGaps.sort((a, b) => a - b)[Math.floor(timeGaps.length / 2)] : 60000
  const gapThreshold = Math.max(medianGap * 5, 10 * 60 * 1000) // 10 min minimum

  // Pre-compute gap indices for segment styling
  const gapIndices = new Set<number>()
  for (let i = 1; i < sortedData.length; i++) {
    const t1 = sortedData[i-1].time instanceof Date ? sortedData[i-1].time.getTime() : new Date(sortedData[i-1].time).getTime()
    const t2 = sortedData[i].time instanceof Date ? sortedData[i].time.getTime() : new Date(sortedData[i].time).getTime()
    if (t2 - t1 > gapThreshold) {
      gapIndices.add(i - 1)
    }
  }

  return {
    datasets: [
      {
        label: props.sensorLabel,
        backgroundColor: hexToRgba(props.sensorColor, 0.2),
        borderColor: props.sensorColor,
        borderWidth: 2,
        data: sortedData.map(m => ({ x: m.time as unknown as number, y: m.value })),
        tension: 0.2,
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 8,
        pointHoverBorderWidth: 3,
        pointHoverBackgroundColor: '#ffffff',
        pointHoverBorderColor: props.sensorColor,
        hitRadius: 10,
        spanGaps: true,
        segment: {
          borderDash: (ctx: { p0DataIndex: number }) => gapIndices.has(ctx.p0DataIndex) ? [6, 6] : undefined,
          borderColor: (ctx: { p0DataIndex: number }) => gapIndices.has(ctx.p0DataIndex) ? hexToRgba(props.sensorColor, 0.4) : undefined,
        },
      },
    ],
  }
})

const chartOptions = computed<ChartOptions<'line'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: false as const,
  interaction: {
    intersect: false,
    mode: 'nearest',
    axis: 'x',
  },
  scales: {
    x: {
      type: 'time' as const,
      display: true,
      time: {
        displayFormats: {
          minute: 'HH:mm',
          hour: 'HH:mm',
          day: 'dd/MM',
          month: 'MM/yyyy'
        }
      },
      border: { display: false },
      grid: { color: isDark.value ? 'rgba(75, 85, 99, 0.3)' : '#f3f4f6', drawBorder: false },
      ticks: {
        font: { family: "'Inter', sans-serif", size: 11 },
        color: '#9ca3af',
        maxTicksLimit: 8,
      },
    },
    y: {
      display: true,
      min: graphMinMax.value.min,
      max: graphMinMax.value.max,
      border: { display: false },
      grid: { color: isDark.value ? 'rgba(75, 85, 99, 0.3)' : '#f3f4f6', drawBorder: false },
      ticks: {
        color: props.sensorColor,
        font: { family: "'Inter', sans-serif", size: 11 },
        maxTicksLimit: 6,
        callback: function (value) {
          if (typeof value === 'number') {
            return Math.round(value).toString()
          }
          return String(value)
        },
      },
    },
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      enabled: true,
      backgroundColor: '#111827',
      padding: 12,
      cornerRadius: 8,
      displayColors: true,
      titleColor: '#f9fafb',
      bodyColor: '#f9fafb',
      borderColor: '#374151',
      borderWidth: 1,
      titleFont: {
        family: "'Inter', sans-serif",
        size: 12,
        weight: 'bold' as const,
      },
      bodyFont: {
        family: "'Inter', sans-serif",
        size: 13,
        weight: 'normal' as const,
      },
      callbacks: {
        title: context => {
          const date = new Date(context[0].parsed.x)
          return date.toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        },
        label: context => {
          const value = context.parsed.y
          if (typeof value !== 'number') return ''
          const formattedValue = Number.isInteger(value)
            ? value.toString()
            : value.toFixed(1).replace(/\.0$/, '')
          const unit = props.sensorUnit || ''
          return `${props.sensorLabel}: ${formattedValue} ${unit}`.trim()
        },
      },
    },
  },
}))
</script>

<style scoped>
/* Panel slides: starts fast, slows at the end */
.slide-panel-enter-active {
  transition: all 0.35s cubic-bezier(0, 0, 0.2, 1);
}

.slide-panel-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 1, 1);
}

.slide-panel-enter-from,
.slide-panel-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Shadow separator top (inverted - shadow goes down) */
.shadow-separator-top {
  background: radial-gradient(ellipse 70% 100% at center top, rgba(0, 0, 0, 0.08) 0%, transparent 100%);
}

:global(.dark) .shadow-separator-top {
  background: radial-gradient(ellipse 70% 100% at center top, rgba(0, 0, 0, 0.9) 0%, transparent 100%);
}
</style>
