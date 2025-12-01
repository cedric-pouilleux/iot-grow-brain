<template>
  <div v-if="selectedSensor" class="mt-4 animate-fade-in">
    <h3 class="font-bold text-gray-700 uppercase text-sm flex items-center gap-2 mb-4">
      <span class="w-2 h-2 rounded-full" :style="{ backgroundColor: sensorColor }"></span>
      {{ sensorLabel }}
    </h3>

    <div class="h-80 w-full relative">
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

interface Props {
  selectedSensor: string | null
  history: SensorDataPoint[]
  sensorLabel: string
  sensorColor: string
  sensorUnit: string
}

const props = withDefaults(defineProps<Props>(), {
  selectedSensor: null,
  history: () => [],
})

defineEmits<{
  close: []
}>()

const hasHistory = computed(() => props.history && props.history.length >= 2)

const graphMinMax = computed(() => {
  if (!hasHistory.value) return { min: 0, max: 100 }
  const values = props.history.map(d => d.value).filter(v => v !== null && v !== undefined)
  if (values.length === 0) return { min: 0, max: 100 }
  let min = Math.min(...values)
  let max = Math.max(...values)

  // Petit padding pour ne pas coller aux bords (identique aux mini cards)
  const range = max - min || 1
  return {
    min: min - range * 0.1,
    max: max + range * 0.1,
  }
})

// Configuration Chart.js identique aux petits graphiques
const chartData = computed<ChartData<'line'> | null>(() => {
  if (!hasHistory.value) return null

  const sortedData = [...props.history].sort((a, b) => {
    const timeA = a.time instanceof Date ? a.time.getTime() : new Date(a.time).getTime()
    const timeB = b.time instanceof Date ? b.time.getTime() : new Date(b.time).getTime()
    return timeA - timeB
  })

  const hexToRgba = (hex: string, alpha: number): string => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
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
      },
    ],
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    intersect: false,
    mode: 'index' as const,
  },
  scales: {
    x: {
      type: 'time' as const,
      display: true,
      time: {
        unit: 'minute' as const,
      },
      border: { display: false },
      grid: { color: '#f3f4f6', drawBorder: false },
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
      grid: { color: '#f3f4f6', drawBorder: false },
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
      backgroundColor: '#1f2937',
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
