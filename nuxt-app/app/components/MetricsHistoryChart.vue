<template>
  <div class="h-64">
    <ClientOnly>
      <Line v-if="chartData" :data="chartData" :options="chartOptions" />
      <template #fallback>
        <div class="h-full flex items-center justify-center text-gray-400">Chargement...</div>
      </template>
    </ClientOnly>
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
  Filler,
  Legend,
  Tooltip,
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
    Filler,
    Legend,
    Tooltip
  )
}

const props = defineProps({
  history: {
    type: Array,
    default: () => [],
  },
})

const chartData = computed(() => {
  if (!props.history || props.history.length === 0) return null

  return {
    datasets: [
      {
        label: 'Taille du code (KB)',
        data: props.history.map(m => ({ x: m.time, y: m.code_size_kb })),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.3,
        fill: true,
        yAxisID: 'y-code',
      },
      {
        label: 'Taille BDD (MB)',
        data: props.history.map(m => ({
          x: m.time,
          y: m.db_size_bytes ? m.db_size_bytes / 1024 / 1024 : null,
        })),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.3,
        fill: true,
        yAxisID: 'y-db',
      },
    ],
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { intersect: false },
  scales: {
    x: {
      type: 'time',
      time: {
        unit: 'day',
        tooltipFormat: 'dd/MM/yyyy HH:mm',
      },
      title: {
        display: true,
        text: 'Date',
      },
    },
    'y-code': {
      type: 'linear',
      position: 'left',
      title: {
        display: true,
        text: 'Taille code (KB)',
      },
      grid: {
        drawOnChartArea: false,
      },
    },
    'y-db': {
      type: 'linear',
      position: 'right',
      title: {
        display: true,
        text: 'Taille BDD (MB)',
      },
    },
  },
  plugins: {
    legend: {
      display: true,
      position: 'top',
    },
    tooltip: {
      mode: 'index',
      intersect: false,
    },
  },
}))
</script>
