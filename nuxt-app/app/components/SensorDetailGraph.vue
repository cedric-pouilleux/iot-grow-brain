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

<script setup>
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  TimeScale,
  Filler
} from 'chart.js'
import { Line } from 'vue-chartjs'
import 'chartjs-adapter-date-fns'

// Enregistrer Chart.js uniquement côté client
if (process.client) {
  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    TimeScale,
    Filler
  )
}

const props = defineProps({
  selectedSensor: { type: String, default: null },
  history: { type: Array, default: () => [] },
  sensorLabel: { type: String, required: true },
  sensorColor: { type: String, required: true },
  sensorUnit: { type: String, required: true }
})

defineEmits(['close'])

const hasHistory = computed(() => props.history && props.history.length >= 2)

const graphMinMax = computed(() => {
  if (!hasHistory.value) return { min: 0, max: 100 }
  const values = props.history.map(d => d.value).filter(v => v !== null && v !== undefined)
  if (values.length === 0) return { min: 0, max: 100 }
  let min = Math.min(...values)
  let max = Math.max(...values)
  
  // Petit padding pour ne pas coller aux bords
  const range = max - min || 1
  return { 
    min: min - (range * 0.1), 
    max: max + (range * 0.1) 
  }
})

// Configuration Chart.js identique aux petits graphiques
const chartData = computed(() => {
  if (!hasHistory.value) return null
  
  // Trier les données par temps croissant
  const sortedData = [...props.history].sort((a, b) => {
    const timeA = a.time instanceof Date ? a.time.getTime() : new Date(a.time).getTime()
    const timeB = b.time instanceof Date ? b.time.getTime() : new Date(b.time).getTime()
    return timeA - timeB
  })
  
  // Convertir la couleur hex en rgba pour le fill
  const hexToRgba = (hex, alpha) => {
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
        data: sortedData.map(m => ({ x: m.time, y: m.value })),
        tension: 0.2,
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 6,
        spanGaps: true
      }
    ]
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { intersect: false },
  scales: {
    x: {
      type: 'time',
      display: true,
      time: {
        unit: 'minute'
      },
      border: { display: false },
      grid: { color: '#f3f4f6', drawBorder: false },
      ticks: { 
        font: { family: "'Inter', sans-serif", size: 11 }, 
        color: '#9ca3af',
        maxTicksLimit: 8
      }
    },
    y: {
      display: true,
      min: graphMinMax.value.min,
      max: graphMinMax.value.max,
      border: { display: false },
      grid: { color: '#f3f4f6', drawBorder: false },
      ticks: { 
        color: props.sensorColor,
        font: { family: "'Inter', sans-serif", size: 11 }
      }
    }
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      enabled: true,
      backgroundColor: '#1f2937',
      padding: 10,
      cornerRadius: 8,
      displayColors: false
    }
  }
}))
</script>

