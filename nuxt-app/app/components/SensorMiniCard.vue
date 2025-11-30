<template>
  <div
    ref="cardRef"
    class="relative rounded-lg transition-all group/card cursor-pointer hover:shadow-md bg-white border border-gray-100 shadow-sm hover:shadow-md"
    @click="$emit('toggle-graph')"
  >
    <!-- Header avec Label, Status et Valeur -->
    <SensorCardHeader :label="label" :sensor="sensor" :is-active="isActive" :color="color" />

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
    </div>

    <!-- Mini Graphique avec Chart.js -->
    <div v-if="hasHistory" class="h-24 w-full relative p-0.5 rounded-lg">
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
}

const props = withDefaults(defineProps<Props>(), {
  color: 'gray',
  history: () => [],
  isGraphOpen: false,
  moduleId: null,
  sensorKey: null,
  initialInterval: 60,
})

const emit = defineEmits<{
  'toggle-graph': []
}>()

const cardRef = ref<HTMLElement | null>(null)
const cardWidth = ref(0)

const handleIntervalSave = (_newInterval: number) => {
  // Handled by SensorIntervalDropdown
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

const hasHistory = computed(() => props.history && props.history.length >= 2)

const strokeColor = computed(() => (isActive.value ? colors.value.stroke : '#d1d5db'))

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
  const values = props.history.map(d => d.value).filter(v => v !== null)
  if (values.length === 0) return { min: 0, max: 100 }
  let min = Math.min(...values)
  let max = Math.max(...values)

  // Petit padding pour ne pas coller aux bords
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
  interaction: { intersect: false },
  scales: {
    x: {
      type: 'time' as const,
      display: false,
      time: {
        unit: 'minute' as const,
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
