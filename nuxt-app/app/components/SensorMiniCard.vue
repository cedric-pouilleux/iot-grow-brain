<template>
  <div
    ref="cardRef"
    class="relative rounded-lg transition-all group/card cursor-pointer hover:shadow-md bg-white border border-gray-100 shadow-sm hover:shadow-md"
    @click="$emit('toggle-graph')"
  >
    <!-- Header avec Label, Status et Valeur -->
    <SensorCardHeader :label="label" :sensor="sensor" :is-active="isActive" :color="color" :is-incoherent="isIncoherent" />

    <!-- Dernier rafraîchissement avec dropdown stockage -->

    <div v-if="isActive" class="relative flex items-center gap-1 text-[10px]">
      <SensorIntervalDropdown
        :time-ago="timeAgo"
        :initial-interval="props.initialInterval"
        :module-id="props.moduleId"
        :sensor-key="props.sensorKey"
        :card-width="cardWidth"
        @save="handleIntervalSave"
      />
      
      <!-- Reset Button -->
      <button 
        v-if="props.moduleId && props.sensorKey"
        @click.stop="handleReset"
        class="p-1 rounded-full hover:bg-gray-100 transition-colors"
        :class="isIncoherent ? 'text-yellow-500 bg-yellow-50 hover:bg-yellow-100 animate-pulse' : 'text-gray-400 hover:text-blue-500'"
        :title="isIncoherent ? 'Valeur incohérente détectée - Cliquer pour redémarrer' : 'Redémarrer la sonde'"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
          <path d="M3 3v5h5"/>
        </svg>
      </button>
    </div>

    <!-- Mini Graphique avec Chart.js -->
    <div v-if="hasHistory" class="h-24 w-full relative p-0.5 rounded-lg">
      <!-- Loading overlay -->
      <div v-if="isLoading" class="absolute inset-0 bg-white/80 flex items-center justify-center z-10 rounded-lg">
        <div class="animate-spin w-5 h-5 border-2 border-gray-300 border-t-emerald-500 rounded-full"></div>
      </div>
      <ClientOnly>
        <Line v-if="chartData" :data="chartData" :options="chartOptions" class="rounded-lg" />
        <template #fallback>
          <div class="h-full flex items-center justify-center text-[10px] text-gray-300">
            Chargement...
          </div>
        </template>
      </ClientOnly>
    </div>

    <div
      v-else
      class="h-24 flex items-center justify-center text-[10px] text-gray-300 border-t border-gray-100 mt-2"
    >
      Pas d'historique
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SensorDataPoint } from '../types'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { ChartData, ChartOptions } from 'chart.js'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  TimeScale,
  Filler,
} from 'chart.js'
import { Line } from 'vue-chartjs'
import 'chartjs-adapter-date-fns'
import { useTimeAgo } from '../composables/useTimeAgo'
import SensorIntervalDropdown from './SensorIntervalDropdown.vue'
import SensorCardHeader from './SensorCardHeader.vue'

if (process.client) {
  ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, TimeScale, Filler)
}

interface SensorInfo {
  status?: string
  value?: number
  model?: string
}

interface Props {
  label: string
  sensor: SensorInfo
  color?: string
  history?: SensorDataPoint[]
  isGraphOpen?: boolean
  moduleId?: string | null
  sensorKey?: string | null
  initialInterval?: number
  isLoading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  color: 'gray',
  history: () => [],
  isGraphOpen: false,
  moduleId: null,
  sensorKey: null,
  initialInterval: 60,
  isLoading: false,
})

const emit = defineEmits<{
  'toggle-graph': []
}>()

const cardRef = ref<HTMLElement | null>(null)
const cardWidth = ref(0)

const handleIntervalSave = (_newInterval: number) => {
  // Handled by SensorIntervalDropdown

}

const handleReset = async () => {
  if (!props.moduleId || !props.sensorKey) return
  
  // Map sensorKey to backend sensor types if needed
  let sensorType = props.sensorKey
  if (sensorType === 'temperature') sensorType = 'temp'
  if (sensorType === 'humidity') sensorType = 'humidity' // Backend expects 'humidity' or 'temp' or 'co2' etc.
  // Actually schema says: 'co2', 'temp', 'humidity', 'voc', 'pressure', 'all'
  
  try {
    await $fetch(`/api/modules/${props.moduleId}/reset-sensor`, {
      method: 'POST',
      body: { sensor: sensorType }
    })
    // Optional: Show toast notification
  } catch (err) {
    console.error('Failed to reset sensor', err)
  }
}

let resizeObserver: ResizeObserver | null = null

const initialLastTime = ref(null)

onMounted(() => {
  if (cardRef.value) {
    cardWidth.value = cardRef.value.offsetWidth
  }

  resizeObserver = new ResizeObserver(() => {
    if (cardRef.value) {
      cardWidth.value = cardRef.value.offsetWidth
    }
  })

  if (cardRef.value) {
    resizeObserver.observe(cardRef.value)
  }

  // Capturer le timestamp du dernier point au chargement
  if (props.history && props.history.length > 0) {
    const last = props.history[props.history.length - 1]
    initialLastTime.value =
      last.time instanceof Date ? last.time.getTime() : new Date(last.time).getTime()
  }
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
})

const colorMap = {
  emerald: { text: 'text-emerald-600', stroke: '#10b981' },
  orange: { text: 'text-orange-500', stroke: '#f97316' },
  blue: { text: 'text-blue-500', stroke: '#3b82f6' },
  violet: { text: 'text-violet-500', stroke: '#8b5cf6' },
  pink: { text: 'text-pink-500', stroke: '#ec4899' },
  cyan: { text: 'text-cyan-500', stroke: '#06b6d4' },
  gray: { text: 'text-gray-400', stroke: '#9ca3af' },
}

const colors = computed(() => colorMap[props.color] || colorMap.gray)

const isActive = computed(() => {
  if (props.sensor?.status === 'ok') return true
  if (props.sensor?.status === 'missing') return false
  return props.sensor?.value !== null && props.sensor?.value !== undefined
})

const isIncoherent = computed(() => {
  if (!props.sensor?.value || !props.sensorKey) return false
  const val = props.sensor.value
  
  // Seuils de cohérence
  if (props.sensorKey === 'pressure') return val < 800 || val > 1200
  if (props.sensorKey === 'temperature' || props.sensorKey === 'temperature_bmp') return val < -20 || val > 80
  if (props.sensorKey === 'humidity') return val < 0 || val > 100
  if (props.sensorKey === 'co2') return val < 300 || val > 5000
  
  return false
})

const hasHistory = computed(() => props.history && props.history.length >= 2)

const strokeColor = computed(() => {
  if (isIncoherent.value) return '#eab308' // Yellow-500
  return isActive.value ? colors.value.stroke : '#d1d5db'
})

const timeAgo = useTimeAgo(() => {
  if (!props.history || props.history.length === 0) return null

  const lastItem = props.history[props.history.length - 1]
  const lastTime =
    lastItem.time instanceof Date ? lastItem.time.getTime() : new Date(lastItem.time).getTime()

  // Si on n'a pas encore reçu de NOUVELLE donnée (timestamp > initial), on affiche --
  // Sauf si on n'avait pas de donnée initiale (initialLastTime est null), alors on affiche dès la première
  if (initialLastTime.value && lastTime <= initialLastTime.value) {
    return null
  }

  return lastItem.time
})

const graphMinMax = computed(() => {
  if (!hasHistory.value) return { min: 0, max: 100 }
  const values = props.history.map(d => d.value).filter(v => v !== null && v !== undefined)
  if (values.length === 0) return { min: 0, max: 100 }
  let min = Math.min(...values)
  let max = Math.max(...values)

  // Petit padding pour ne pas coller aux bords (identique au graphique détaillé)
  const range = max - min || 1
  return {
    min: min - range * 0.1,
    max: max + range * 0.1,
  }
})

// Configuration Chart.js pour le sparkline
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
        label: props.label,
        backgroundColor: hexToRgba(strokeColor.value, 0.2),
        borderColor: strokeColor.value,
        borderWidth: 2,
        data: sortedData.map(m => ({ x: m.time as unknown as number, y: m.value })),
        tension: 0.2,
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 0,
        spanGaps: true,
      },
    ],
  }
})

const chartOptions = computed<ChartOptions<'line'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  interaction: { intersect: false },
  scales: {
    x: {
      type: 'time' as const,
      display: false,
      time: {
        displayFormats: {
          minute: 'HH:mm',
          hour: 'HH:mm',
          day: 'dd/MM',
          month: 'MM/yyyy'
        }
      },
    },
    y: {
      display: false,
      min: graphMinMax.value.min,
      max: graphMinMax.value.max,
    },
  },
  plugins: {
    legend: { display: false },
    tooltip: { enabled: false },
  },
}))
</script>
