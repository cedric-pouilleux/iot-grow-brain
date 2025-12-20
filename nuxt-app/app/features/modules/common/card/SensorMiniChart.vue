<template>
  <div v-if="showCharts" class="h-[92px] w-full relative mt-2 rounded-b-lg overflow-hidden">
    <!-- Loading overlay -->
    <div v-if="isLoading" class="absolute inset-0 bg-white/80 dark:bg-gray-800/80 flex items-center justify-center z-10">
      <div class="animate-spin w-5 h-5 border-2 border-gray-300 border-t-emerald-500 rounded-full"></div>
    </div>

    <!-- Maximize button -->
    <button 
      @click.stop="$emit('maximize')"
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
</template>

<script setup lang="ts">
import { computed } from 'vue'
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
import annotationPlugin from 'chartjs-plugin-annotation'
import type { ChartData, ChartOptions } from 'chart.js'
import type { SensorDataPoint } from '../types'
import { useThresholds } from './composables'
import { useChartSettings } from '~/features/modules/common/sensors-module-options/composables'

// Register ChartJS components
if (process.client) {
  ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, TimeScale, Filler, Tooltip, annotationPlugin)
}

interface Props {
  history: SensorDataPoint[]
  sensorKey: string
  label: string
  color: string
  isPanelOpen?: boolean
  isLoading?: boolean
  graphDuration?: string
}

const props = withDefaults(defineProps<Props>(), {
  isPanelOpen: false,
  isLoading: false,
  graphDuration: '24h',
})

defineEmits<{
  'maximize': []
}>()

const { getThresholdColor, getThresholdDefinition } = useThresholds()
const { showCharts, showThresholdLines, colorThresholds } = useChartSettings()

// Color mapping
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
const chartStrokeColor = computed(() => props.isPanelOpen ? '#ffffff' : strokeColor.value)

// Helper function
const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// Chart data computation
const chartData = computed<ChartData<'line'> | null>(() => {
  const history = props.history
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

  // Gap detection
  const gapIndices = new Set<number>()
  const timeGaps: number[] = []
  for (let i = 1; i < sortedData.length; i++) {
    timeGaps.push(new Date(sortedData[i].time).getTime() - new Date(sortedData[i-1].time).getTime())
  }
  const medianGap = timeGaps.length ? timeGaps.sort((a,b) => a-b)[Math.floor(timeGaps.length/2)] : 60000
  const gapThreshold = Math.max(medianGap * 5, 2 * 60 * 60 * 1000)

  for (let i = 1; i < sortedData.length; i++) {
    if (new Date(sortedData[i].time).getTime() - new Date(sortedData[i-1].time).getTime() > gapThreshold) {
      gapIndices.add(i - 1)
    }
  }

  // Threshold colors
  const segmentColors: (string | null)[] = colorThresholds.value
    ? sortedData.map(d => getThresholdColor(props.sensorKey, d.value))
    : []

  return {
    datasets: [{
      label: props.label,
      backgroundColor: hexToRgba(chartStrokeColor.value, 0.15),
      borderColor: chartStrokeColor.value,
      borderWidth: 2,
      data: sortedData.map(m => ({ x: new Date(m.time).getTime(), y: m.value })),
      tension: 0.2,
      fill: 'start',
      pointRadius: 0,
      segment: {
        borderDash: (ctx: any) => gapIndices.has(ctx.p0DataIndex) ? [4, 4] : undefined,
        borderColor: (ctx: any) => {
          if (gapIndices.has(ctx.p0DataIndex)) {
            return hexToRgba(strokeColor.value, 0.3)
          }
          if (colorThresholds.value) {
            const startColor = segmentColors[ctx.p0DataIndex]
            const endColor = segmentColors[ctx.p1DataIndex]
            return endColor || startColor || undefined
          }
          return undefined
        }
      }
    }]
  }
})

// Chart options
const chartOptions = computed<ChartOptions<'line'>>(() => {
  const annotations: Record<string, any> = {}
  
  if (showThresholdLines.value) {
    const thresholds = getThresholdDefinition(props.sensorKey)
    if (thresholds) {
      annotations.moderateLine = {
        type: 'line',
        yMin: thresholds.good,
        yMax: thresholds.good,
        borderColor: 'rgba(245, 158, 11, 0.6)',
        borderWidth: 1,
        borderDash: [4, 4],
        label: { display: false }
      }
      annotations.poorLine = {
        type: 'line',
        yMin: thresholds.moderate,
        yMax: thresholds.moderate,
        borderColor: 'rgba(249, 115, 22, 0.6)',
        borderWidth: 1,
        borderDash: [4, 4],
        label: { display: false }
      }
      annotations.hazardousLine = {
        type: 'line',
        yMin: thresholds.poor,
        yMax: thresholds.poor,
        borderColor: 'rgba(239, 68, 68, 0.6)',
        borderWidth: 1,
        borderDash: [4, 4],
        label: { display: false }
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
        backgroundColor: '#1f2937',
        bodyColor: '#fff',
        padding: 8,
        cornerRadius: 6,
        displayColors: false,
        titleFont: { size: 10, weight: 'normal' as const },
        bodyFont: { size: 12, weight: 'bold' as const },
        callbacks: {
          title: (items: any[]) => {
            const date = new Date(items[0].parsed.x)
            return date.toLocaleString('fr-FR', {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })
          },
          label: (item: any) => {
            const val = item.parsed.y
            return typeof val === 'number' ? val.toFixed(1) : ''
          }
        }
      },
      ...(process.client ? { annotation: { annotations } } : {})
    }
  }
})
</script>
