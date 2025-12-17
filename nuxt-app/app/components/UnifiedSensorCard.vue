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
    class="relative rounded-lg group/card bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-between flex-1 min-w-0"
    :style="{ '--shadow-color': hoverShadowColor }"
  >
    <!-- Header: Title + Sensor Selector -->
    <div class="pl-2" :class="showCharts ? 'pb-0' : 'pb-3'">
      <div class="flex justify-between">
        <div class="flex items-center gap-1">
           <!-- Status Indicator (in header) -->
           <Icon
             :name="statusIcon"
             class="w-2.5 h-2.5"
             :class="statusColor"
             :title="statusTooltip"
           />
           <span class="text-gray-500 dark:text-white text-[13px]">{{ currentTitle }}</span>
        </div>

        <div class="flex">
           <!-- Sensor Selection Dropdown (for multi-sensor groups) -->
           <AppDropdown
             v-if="sensors.length > 1"
             :id="`sensor-list-${moduleId}-${sensors[0]?.key || 'default'}`"
             position="static"
             dropdown-class="left-0 w-full bg-gray-950 rounded-b-lg rounded-t-none shadow-xl overflow-hidden text-sm"
           >
             <template #trigger="{ isOpen, toggle }">
               <button 
                 @click.stop="toggle"
                 class="p-1 rounded-tr-lg text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-950 transition-colors flex items-center"
                 :class="{'bg-gray-950': isOpen}"
                 title="Changer de capteur"
               >
                 <Icon name="tabler:cpu" class="w-4 h-4" />
               </button>
             </template>

             <template #content="{ close }">
               <div class="max-h-48 overflow-hidden">  
                 <button
                   v-for="(sensor, index) in sensors"
                   :key="sensor.key"
                   @click="selectSensor(sensor.key, close)"
                   class="w-full text-left p-2 flex items-center justify-between transition-colors dropdown-item-animate"
                   :class="activeSensorKey === sensor.key ? valueColorClass : 'text-gray-400 hover:bg-gray-900 hover:text-white'"
                   :style="{ animationDelay: `${index * 50}ms` }"
                 >
                   <span class="text-xs">
                     {{ getDropdownItemLabel(sensor) }}
                   </span>
                   <div class="flex items-center gap-2">
                      <span class="font-bold font-mono text-xs" :class="activeSensorKey === sensor.key ? valueColorClass : ''">{{ formatSensorValue(sensor.value) }}<span class="text-xs font-normal" :class="activeSensorKey === sensor.key ? 'opacity-70' : 'text-gray-500'">{{ getUnit(sensor.key) }}</span></span>
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
           <!-- Placeholder to maintain alignment when no dropdown -->
           <div v-else class="w-6 h-6"></div>
        </div>
      </div>

      <!-- Main Value Display -->
      <div class="flex items-center">
        <!-- Value -->
        <span class="text-3xl font-bold tracking-tight" :class="valueColorClass">
          {{ formattedValue }}
        </span>
        
        <!-- Trend + Unit stacked vertically -->
        <div class="flex flex-col items-start ml-1 -mb-0.5">
          <!-- Trend Arrow (above unit) - only show when sensor is active and trend exists -->
          <Icon
            v-if="activeSensor?.status !== 'missing' && trend !== 'stable'"
            :name="trend === 'up' ? 'tabler:triangle-filled' : 'tabler:triangle-inverted-filled'"
            class="w-2 h-2 "
            :class="trendColorClass"
            :title="trendTooltip"
          />
          <!-- Empty space if no trend to maintain alignment -->
          <div v-else class="w-2.5 h-2.5 -mb-0.5"></div>
          
          <!-- Unit -->  
          <span class="text-sm font-medium text-gray-400 dark:text-gray-400">{{ unit }}</span>
        </div>
      </div>
      
      <!-- Threshold Alert (below value, only when not good) -->
      <div class="h-[18px] flex items-center">
        <UITag 
          v-if="thresholdAlert && thresholdAlert.level !== 'good'" 
          :label="thresholdAlert.label"
          :variant="thresholdAlert.tagVariant"
        />
      </div>
    </div>

    <!-- Graph Area (only when charts enabled) -->
    <div v-if="showCharts" class="h-[92px] w-full relative mt-2 rounded-b-lg overflow-hidden">
      <!-- Loading overlay -->
      <div v-if="isLoading" class="absolute inset-0 bg-white/80 dark:bg-gray-800/80 flex items-center justify-center z-10">
        <div class="animate-spin w-5 h-5 border-2 border-gray-300 border-t-emerald-500 rounded-full"></div>
      </div>

      <!-- Maximize Graph Button -->
      <button 
        @click.stop="$emit('toggle-graph')"
        class="absolute bottom-1 right-1 w-6 h-6 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-900 rounded transition-colors z-20 opacity-0 group-hover/card:opacity-100"
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
  Tooltip,
} from 'chart.js'
import 'chartjs-adapter-date-fns'
import type { ChartData, ChartOptions } from 'chart.js'
import type { SensorDataPoint } from '../types'
import { formatValue } from '../utils/format'
import { useThresholds } from '../composables/useThresholds'
import AppDropdown from './AppDropdown.vue'
import UITag from './ui/UITag.vue'
import { useChartSettings } from '../composables/useChartSettings'
import annotationPlugin from 'chartjs-plugin-annotation'

// ============================================================================
// ChartJS Registration
// ============================================================================

if (process.client) {
  ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, TimeScale, Filler, Tooltip, annotationPlugin)
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

// Trend calculation: compare average of last 3 values vs previous 3 values
const trend = computed<'up' | 'down' | 'stable'>(() => {
  const history = activeHistory.value
  if (!history || history.length < 6) return 'stable'
  
  // Get last 6 values sorted by time
  const sorted = [...history]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 6)
  
  // Recent 3 values vs older 3 values
  const recentAvg = (sorted[0].value + sorted[1].value + sorted[2].value) / 3
  const olderAvg = (sorted[3].value + sorted[4].value + sorted[5].value) / 3
  
  // Threshold: change must be significant (>1% of older value)
  const threshold = Math.abs(olderAvg) * 0.01 || 0.5
  const diff = recentAvg - olderAvg
  
  if (diff > threshold) return 'up'
  if (diff < -threshold) return 'down'
  return 'stable'
})

// Trend color and tooltip based on whether trend is good or bad
const trendColorClass = computed(() => {
  if (trend.value === 'stable') return 'text-gray-400'
  
  const isPositive = isTrendPositive(activeSensorKey.value, trend.value)
  if (isPositive === true) return 'text-emerald-500'
  if (isPositive === false) return 'text-red-500'
  return 'text-gray-400' // neutral
})

const trendTooltip = computed(() => {
  if (trend.value === 'stable') return ''
  
  const direction = trend.value === 'up' ? 'En hausse' : 'En baisse'
  const isPositive = isTrendPositive(activeSensorKey.value, trend.value)
  
  if (isPositive === true) return `${direction} (positif)`
  if (isPositive === false) return `${direction} (négatif)`
  return direction
})

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
const formattedValue = computed(() => {
  const sensor = activeSensor.value
  // Show '--' if sensor is missing or has no value
  if (!sensor || sensor.status === 'missing' || sensor.value === undefined || sensor.value === null) {
    return '--'
  }
  return formatSensorValue(sensor.value)
})

const valueColorClass = computed(() => {
  const map: Record<string, string> = {
    emerald: 'text-emerald-600',
    orange: 'text-orange-500',
    amber: 'text-amber-500',
    blue: 'text-blue-500',
    violet: 'text-violet-500',
    pink: 'text-pink-500',
    cyan: 'text-cyan-500',
    gray: 'text-gray-400',
  }
  return map[props.color] || 'text-gray-800'
})

// Shadow color for hover effect (colored glow)
const hoverShadowColor = computed(() => {
  const map: Record<string, string> = {
    emerald: 'rgba(16, 185, 129, 0.4)',  // emerald-500
    orange: 'rgba(249, 115, 22, 0.4)',   // orange-500
    amber: 'rgba(245, 158, 11, 0.4)',    // amber-500
    blue: 'rgba(59, 130, 246, 0.4)',     // blue-500
    violet: 'rgba(139, 92, 246, 0.4)',   // violet-500
    pink: 'rgba(236, 72, 153, 0.4)',     // pink-500
    cyan: 'rgba(6, 182, 212, 0.4)',      // cyan-500
    gray: 'rgba(156, 163, 175, 0.3)',    // gray-400
  }
  return map[props.color] || 'rgba(0, 0, 0, 0.2)'
})

// ============================================================================
// Title Logic
// ============================================================================

const currentTitle = computed(() => {
  // PM group: show selected sensor label (PM2.5, PM10, etc.)
  if (props.label === 'Particules fines' && activeSensor.value?.label) {
    return activeSensor.value.label
  }
  
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
  // PM sensors: just show the PM size label (PM1, PM2.5, etc.)
  if (props.label === 'Particules fines') return sensor.label
  
  // COV group: show model with sensor type in parentheses
  if (props.label === 'COV' && sensor.model) {
    return `${sensor.model} (${sensor.label})`
  }
  
  // For all other groups, show just the model name
  return sensor.model || sensor.label
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
  if (k === 'co') return 'ppm'
  if (k === 'tvoc') return 'ppb'
  if (k === 'voc') return '/500'
  if (k.includes('pm')) return 'µg/m³'
  
  return ''
}

const unit = computed(() => activeSensor.value ? getUnit(activeSensor.value.key) : '')

// ============================================================================
// Threshold Alert
// ============================================================================

const { evaluateThreshold, getThresholdColor, getThresholdDefinition, isTrendPositive } = useThresholds()
const { showCharts, showThresholdLines, colorThresholds } = useChartSettings()

const thresholdAlert = computed(() => {
  const sensor = activeSensor.value
  if (!sensor) return null
  return evaluateThreshold(sensor.key, sensor.value)
})

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
  amber: '#f59e0b',
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
  // Use higher threshold to handle historical data which may be aggregated hourly
  const gapIndices = new Set<number>()
  const timeGaps = []
  for (let i = 1; i < sortedData.length; i++) {
    timeGaps.push(new Date(sortedData[i].time).getTime() - new Date(sortedData[i-1].time).getTime())
  }
  const medianGap = timeGaps.length ? timeGaps.sort((a,b) => a-b)[Math.floor(timeGaps.length/2)] : 60000
  // Minimum 2 hours threshold to avoid marking hourly historical data as gaps
  const gapThreshold = Math.max(medianGap * 5, 2 * 60 * 60 * 1000)

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

  // Generate segment colors based on thresholds (only if enabled)
  const sensorKey = activeSensorKey.value
  const segmentColors: (string | null)[] = colorThresholds.value
    ? sortedData.map(d => getThresholdColor(sensorKey, d.value))
    : []

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
        borderColor: (ctx: any) => {
          // Gap styling takes priority
          if (gapIndices.has(ctx.p0DataIndex)) {
            return hexToRgba(strokeColor.value, 0.3)
          }
          // Only apply threshold colors if enabled
          if (colorThresholds.value) {
            const startColor = segmentColors[ctx.p0DataIndex]
            const endColor = segmentColors[ctx.p1DataIndex]
            // Use the more severe color (end point takes priority)
            return endColor || startColor || undefined
          }
          return undefined
        }
      }
    }]
  }
})


const chartOptions = computed<ChartOptions<'line'>>(() => {
  // Build threshold annotations if enabled
  const annotations: Record<string, any> = {}
  
  if (showThresholdLines.value) {
    const thresholds = getThresholdDefinition(activeSensorKey.value)
    if (thresholds) {
      // Moderate threshold line (amber)
      annotations.moderateLine = {
        type: 'line',
        yMin: thresholds.good,
        yMax: thresholds.good,
        borderColor: 'rgba(245, 158, 11, 0.6)',
        borderWidth: 1,
        borderDash: [4, 4],
        label: {
          display: false
        }
      }
      // Poor threshold line (orange)
      annotations.poorLine = {
        type: 'line',
        yMin: thresholds.moderate,
        yMax: thresholds.moderate,
        borderColor: 'rgba(249, 115, 22, 0.6)',
        borderWidth: 1,
        borderDash: [4, 4],
        label: {
          display: false
        }
      }
      // Hazardous threshold line (red)
      annotations.hazardousLine = {
        type: 'line',
        yMin: thresholds.poor,
        yMax: thresholds.poor,
        borderColor: 'rgba(239, 68, 68, 0.6)',
        borderWidth: 1,
        borderDash: [4, 4],
        label: {
          display: false
        }
      }
    }
  }

  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: { intersect: false, mode: 'index' as const },
    scales: {
      x: { type: 'time', display: false },
      y: { display: false }
    },
    plugins: {
      legend: { display: false },
      tooltip: { 
        enabled: true,
        backgroundColor: 'rgba(31, 41, 55, 0.95)',
        titleColor: '#9ca3af',
        bodyColor: '#fff',
        padding: 8,
        cornerRadius: 6,
        displayColors: false,
        titleFont: { size: 10, weight: 'normal' as const },
        bodyFont: { size: 12, weight: 'bold' as const },
        callbacks: {
          title: (items: any[]) => {
            if (!items.length) return ''
            const date = new Date(items[0].raw.x)
            return date.toLocaleString('fr-FR', { 
              day: '2-digit', month: '2-digit', 
              hour: '2-digit', minute: '2-digit' 
            })
          },
          label: (item: any) => {
            const val = item.raw.y
            return `${formatValue(val)} ${unit.value}`
          }
        }
      },
      annotation: {
        annotations
      }
    }
  }
})
</script>

<style scoped>
/* Staggered dropdown item animation - slides up from bottom */
.dropdown-item-animate {
  animation: slideUpFadeIn 0.2s ease-out forwards;
  opacity: 0;
  transform: translateY(8px);
}

@keyframes slideUpFadeIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>

