<template>
  <div class="bg-white rounded-2xl shadow-sm p-6 flex flex-col min-h-[300px] border border-gray-100">
    <div class="flex justify-between items-center mb-4">
      <div class="flex items-baseline gap-3">
        <h2 :class="['text-lg font-bold', titleColorClass]">{{ title }}</h2>
        <span v-if="timeAgo" class="text-xs text-gray-400 font-normal bg-gray-50 px-2 py-0.5 rounded-full transition-all duration-500">{{ timeAgo }}</span>
      </div>
      <div v-if="loading" class="text-gray-400 text-sm animate-pulse">Mise à jour...</div>
    </div>

    <div class="flex-1 relative w-full min-h-[250px]">
      <ClientOnly>
        <Line v-if="chartData" :data="chartData" :options="chartOptions" />
        
        <div v-else-if="loading" class="absolute inset-0 flex items-center justify-center text-gray-400">
          <span class="animate-bounce mr-2">●</span> Chargement...
        </div>
        
        <div v-else class="absolute inset-0 flex items-center justify-center text-gray-400 flex-col">
          <p>Pas de données</p>
          <small class="text-xs text-gray-300">Vérifiez la connexion</small>
        </div>
      </ClientOnly>
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
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler
} from 'chart.js'
import { Line } from 'vue-chartjs'
import 'chartjs-adapter-date-fns'
import { fr } from 'date-fns/locale'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler
)

const props = defineProps({
  title: String,
  data: {
    type: Array,
    default: () => []
  },
  loading: Boolean,
  color: {
    type: String,
    default: '#10b981'
  },
  colorRgba: {
    type: String,
    default: 'rgba(16, 185, 129, 0.2)'
  },
  titleColorClass: {
    type: String,
    default: 'text-gray-800'
  },
  yMin: Number,
  yMax: Number,
  lastUpdate: [Date, String]
})

const timeAgo = ref('')
let timer

const updateTimeAgo = () => {
   if (!props.lastUpdate) { timeAgo.value = ''; return }
   const d = new Date(props.lastUpdate)
   const now = new Date()
   let diff = Math.floor((now - d) / 1000)
   
   if (diff < 0) diff = 0
   
   if (diff < 5) timeAgo.value = `À l'instant`
   else if (diff < 60) timeAgo.value = `Il y a ${diff} s`
   else if (diff < 3600) timeAgo.value = `Il y a ${Math.floor(diff/60)} min`
   else if (diff < 86400) timeAgo.value = `Il y a ${Math.floor(diff/3600)} h`
   else timeAgo.value = `+ de 1 jour`
}

watch(() => props.lastUpdate, updateTimeAgo)

onMounted(() => { 
    updateTimeAgo()
    timer = setInterval(updateTimeAgo, 1000) 
})

onUnmounted(() => {
    if(timer) clearInterval(timer)
})

const chartData = computed(() => {
  if (!props.data || props.data.length === 0) return null

  return {
    datasets: [
      {
        label: props.title,
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, props.colorRgba);
          gradient.addColorStop(1, props.colorRgba.replace('0.2', '0.0').replace('0.1', '0.0'));
          return gradient;
        },
        borderColor: props.color,
        borderWidth: 2,
        data: props.data.map(m => ({ x: m.time, y: m.value })),
        tension: 0.2, 
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 6,
        spanGaps: false 
      }
    ]
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { intersect: false, mode: 'index' },
  scales: {
    x: {
      type: 'time', 
      adapters: { 
        date: { locale: fr } 
      },
      time: {
        unit: 'hour',
        displayFormats: { hour: 'HH:mm' },
        tooltipFormat: 'dd/MM HH:mm'
      },
      border: { display: false },
      grid: { display: false },
      ticks: { 
        font: { family: "'Inter', sans-serif", size: 11 }, 
        color: '#9ca3af',
        maxTicksLimit: 8,
        source: 'auto'
      }
    },
    y: {
      ...(props.yMin !== undefined ? { min: props.yMin } : {}),
      ...(props.yMax !== undefined ? { max: props.yMax } : {}),
      beginAtZero: props.yMin === 0,
      border: { display: false },
      grid: { color: '#f3f4f6', drawBorder: false },
      ticks: { color: props.color }
    }
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1f2937',
      padding: 10,
      cornerRadius: 8,
      displayColors: false
    }
  }
}))
</script>
