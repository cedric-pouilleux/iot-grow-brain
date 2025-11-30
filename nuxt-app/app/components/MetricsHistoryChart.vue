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
        pointRadius: 0,
        pointHoverRadius: 8,
        pointHoverBorderWidth: 3,
        pointHoverBackgroundColor: '#ffffff',
        pointHoverBorderColor: '#3b82f6',
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
        pointRadius: 0,
        pointHoverRadius: 8,
        pointHoverBorderWidth: 3,
        pointHoverBackgroundColor: '#ffffff',
        pointHoverBorderColor: '#10b981',
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
      ticks: {
        maxTicksLimit: 6,
        callback: function (value) {
          return Math.round(value).toString()
        },
      },
    },
    'y-db': {
      type: 'linear',
      position: 'right',
      title: {
        display: true,
        text: 'Taille BDD (MB)',
      },
      ticks: {
        maxTicksLimit: 6,
        callback: function (value) {
          return Math.round(value).toString()
        },
      },
    },
  },
  plugins: {
    legend: {
      display: true,
      position: 'top',
    },
    tooltip: {
      enabled: true,
      mode: 'index',
      intersect: false,
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
        weight: '600',
      },
      bodyFont: {
        family: "'Inter', sans-serif",
        size: 13,
        weight: '500',
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
          })
        },
        label: context => {
          const label = context.dataset.label || ''
          const value = context.parsed.y
          if (value === null || value === undefined) return `${label}: --`
          const formattedValue =
            context.datasetIndex === 0
              ? Number.isInteger(value)
                ? value.toString()
                : value.toFixed(1).replace(/\.0$/, '')
              : (value / 1024 / 1024).toFixed(2)
          const unit = context.datasetIndex === 0 ? 'KB' : 'MB'
          return `${label}: ${formattedValue} ${unit}`
        },
      },
    },
  },
}))
</script>
