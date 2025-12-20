<template>
  <div class="col-span-6 md:col-span-3 lg:col-span-1 flex flex-col justify-between space-y-3">
    
    <!-- Hardware Section -->
    <div>
      <div class="flex items-center justify-between">
        <h3 class="text-[13px] text-gray-500 dark:text-white">Hardware</h3>
        <UITooltip :text="'Uptime: ' + formattedUptime" position="left">
          <div 
            class="w-2.5 h-2.5 rounded-full cursor-help"
            :class="isOnline ? 'bg-green-500' : 'bg-red-500'"
          ></div>
        </UITooltip>
      </div>
      <div class="bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm mt-3 p-3">
        <div class="text-xs space-y-0.5 text-gray-500 dark:text-gray-400">
          <div class="flex justify-between items-center mb-1">
            <div class="font-medium text-gray-600 dark:text-gray-300">{{ hardwareModel }}</div>
            <div class="text-[10px]">{{ cpuFreq }} MHz</div>
          </div>
          <div>{{ moduleId }}</div>
        </div>
      </div>
    </div>

    <!-- Network Section -->
    <div>
      <div class="flex items-center justify-between">
        <h3 class="text-[13px] text-gray-500 dark:text-white">Réseau</h3>
        <UITooltip :text="`Signal: ${rssi || '--'} dBm`" position="left">
          <div class="cursor-help">
            <Icon v-if="!rssi" name="tabler:wifi-off" class="w-5 h-5" :class="rssiClass" />
            <Icon v-else-if="rssi > -60" name="tabler:wifi" class="w-5 h-5" :class="rssiClass" />
            <Icon v-else-if="rssi > -75" name="tabler:wifi-2" class="w-5 h-5" :class="rssiClass" />
            <Icon v-else-if="rssi > -85" name="tabler:wifi-1" class="w-5 h-5" :class="rssiClass" />
            <Icon v-else name="tabler:wifi-0" class="w-5 h-5" :class="rssiClass" />
          </div>
        </UITooltip>
      </div>
      <div class="bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm mt-3 p-3">
        <div class="text-xs space-y-0.5">
          <div class="flex justify-between">
            <span class="text-gray-500 dark:text-gray-400">IP</span>
            <span class="text-gray-600 dark:text-gray-300 font-mono text-[10px]">{{ ip || '--' }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500 dark:text-gray-400">MAC</span>
            <span class="text-gray-600 dark:text-gray-300 font-mono text-[10px]">{{ mac || '--' }}</span>
          </div>
        </div>
      </div>
    </div>


    <!-- Memory Section -->
    <div>
      <h3 class="text-[13px] text-gray-500 dark:text-white">Mémoire</h3>
      <div class="bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm mt-3 p-3">
        <div class="flex gap-4 justify-center">
          <!-- Flash Doughnut -->
          <div class="w-16 h-16 relative">
            <ClientOnly>
              <Doughnut :data="flashChartData" :options="doughnutOptions" />
            </ClientOnly>
            <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span class="text-[9px] font-medium text-gray-500 dark:text-gray-400">Flash</span>
            </div>
          </div>
          <!-- RAM Doughnut -->
          <div class="w-16 h-16 relative">
            <ClientOnly>
              <Doughnut :data="ramChartData" :options="doughnutOptions" />
            </ClientOnly>
            <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span class="text-[9px] font-medium text-gray-500 dark:text-gray-400">RAM</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import ModuleStorageSection from './ModuleStorageSection.vue'
import { formatUptime } from '~/utils/time'
import type { DeviceStatus } from '../types'
import UITooltip from '~/components/design-system/UITooltip/UITooltip.vue'

if (process.client) {
  ChartJS.register(ArcElement, Tooltip, Legend)
}

interface Props {
  deviceStatus: DeviceStatus | null
  moduleId: string
}

const props = defineProps<Props>()

const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')

// Formatting helper
const formatKb = (kb: number) => {
  if (kb < 1024) return Math.round(kb) + ' Ko'
  return (kb / 1024).toFixed(1) + ' Mo'
}

// Hardware info
const hardwareModel = computed(() => props.deviceStatus?.hardware?.chip?.model || 'ESP32')
const cpuFreq = computed(() => props.deviceStatus?.hardware?.chip?.cpuFreqMhz || '--')
const isOnline = computed(() => props.deviceStatus?.system?.bootedAt ? true : false)
const formattedUptime = computed(() => {
  const bootedAt = props.deviceStatus?.system?.bootedAt
  if (!bootedAt) return '--'
  const bootTime = new Date(bootedAt).getTime()
  const uptimeMs = Date.now() - bootTime
  return formatUptime(uptimeMs / 1000)
})

// Network info
const rssi = computed(() => props.deviceStatus?.system?.rssi)
const ip = computed(() => props.deviceStatus?.system?.ip)
const mac = computed(() => props.deviceStatus?.system?.mac)

const rssiClass = computed(() => {
  if (!rssi.value) return 'text-gray-400'
  if (rssi.value > -60) return 'text-green-500'
  if (rssi.value > -75) return 'text-yellow-500'
  if (rssi.value > -85) return 'text-orange-500'
  return 'text-red-500'
})

// Memory calculations
const flashPercentages = computed(() => {
  const total = props.deviceStatus?.hardware?.chip?.flashKb || 0
  const used = props.deviceStatus?.system?.flash?.usedKb || 0
  const free = props.deviceStatus?.system?.flash?.freeKb || 0
  const system = props.deviceStatus?.system?.flash?.systemKb || 0
  
  if (total === 0) return { sketchPercent: 0, otaPercent: 0, systemPercent: 0, freePercent: 100 }
  
  return {
    sketchPercent: (used / total) * 100,
    otaPercent: (free / total) * 100,
    systemPercent: (system / total) * 100,
    freePercent: Math.max(0, 100 - ((used + free + system) / total) * 100),
    // Raw values for tooltips
    usedKb: used,
    freeKb: free,
    systemKb: system
  }
})

const ramPercentages = computed(() => {
  const total = props.deviceStatus?.system?.memory?.heapTotalKb || 0
  const free = props.deviceStatus?.system?.memory?.heapFreeKb || 0
  const used = total - free
  
  if (total === 0) return { usedPercent: 0, freePercent: 100, usedKb: 0, freeKb: 0 }
  
  return {
    usedPercent: (used / total) * 100,
    freePercent: (free / total) * 100,
    usedKb: used,
    freeKb: free
  }
})

// Custom Tooltip Handler from original code
const externalTooltipHandler = (context: any) => {
  // Tooltip Element
  let tooltipEl = document.getElementById('chartjs-tooltip')

  // Create element on first render
  if (!tooltipEl) {
    tooltipEl = document.createElement('div')
    tooltipEl.id = 'chartjs-tooltip'
    tooltipEl.style.background = 'rgba(0, 0, 0, 0.8)'
    tooltipEl.style.borderRadius = '3px'
    tooltipEl.style.color = 'white'
    tooltipEl.style.opacity = '1'
    tooltipEl.style.pointerEvents = 'none'
    tooltipEl.style.position = 'absolute'
    tooltipEl.style.transform = 'translate(-50%, 0)'
    tooltipEl.style.transition = 'all .1s ease'
    tooltipEl.style.padding = '6px'
    tooltipEl.style.fontSize = '10px'
    tooltipEl.style.zIndex = '100'
    document.body.appendChild(tooltipEl)
  }

  const tooltip = context.tooltip
  const chart = context.chart

  // Hide if no tooltip
  if (tooltip.opacity === 0) {
    tooltipEl.style.opacity = '0'
    return
  }
  
  if (tooltip.body) {
    const dataPoints = tooltip.dataPoints
    if (dataPoints && dataPoints.length > 0) {
      const dataPoint = dataPoints[0]
      const label = dataPoint.label || ''
      
      // Get the raw value and formatted text based on label
      let text = ''
      
      if (label === 'Sketch') {
        const kb = flashPercentages.value.usedKb
        text = `${label}: ${formatKb(kb)} (${Math.round(dataPoint.raw)}%)`
      } else if (label === 'OTA') {
        const kb = flashPercentages.value.freeKb // Note: 'free' in flash usually means OTA space in ESP32 context of this app? Or is it inverted? 
        // Checking original: OTA was mapping to 'free' in flash structure usually? 
        // Actually original used: otaTooltip = computed(() => `OTA: ${formatKb(kb)}`) where kb = props.deviceStatus?.system?.flash?.freeKb
        // So yes, flash.freeKb corresponds to OTA partition space usually or just free space.
        // Let's stick to variable names.
        text = `${label}: ${formatKb(kb)} (${Math.round(dataPoint.raw)}%)`
      } else if (label === 'System') {
        const kb = flashPercentages.value.systemKb
        text = `${label}: ${formatKb(kb)} (${Math.round(dataPoint.raw)}%)`
      } else if (label === 'Libre') { // Flash Free
        // This is actually the remaining space not covered by partitions? 
        // Original logic: freePercent = 100 - others.
        // It seems 'Libre' here is just visual filler for 100%?
        // Let's just show %.
        text = `${label}: ${Math.round(dataPoint.raw)}%`
      } else if (label === 'Utilisé') { // RAM Used
        const kb = ramPercentages.value.usedKb
        text = `${label}: ${formatKb(kb)} (${Math.round(dataPoint.raw)}%)`
      } else if (label === 'Disponible') { // RAM Free
        const kb = ramPercentages.value.freeKb
        text = `${label}: ${formatKb(kb)} (${Math.round(dataPoint.raw)}%)`
      } else {
        text = `${label}: ${Math.round(dataPoint.raw)}%`
      }
      
      tooltipEl.textContent = text
    }
  }
  
  const { left, top } = chart.canvas.getBoundingClientRect()
  
  // Handle position relative to viewport (external tooltip needs absolute positioning on page)
  const positionX = left + window.pageXOffset + tooltip.caretX
  const positionY = top + window.pageYOffset + tooltip.caretY
  
  tooltipEl.style.opacity = '1'
  tooltipEl.style.left = positionX + 'px'
  tooltipEl.style.top = positionY - 30 + 'px' // Shift up slightly
}

// Chart data
const flashChartData = computed(() => ({
  labels: ['Sketch', 'OTA', 'System', 'Libre'],
  datasets: [{
    data: [
      flashPercentages.value.sketchPercent,
      flashPercentages.value.otaPercent,
      flashPercentages.value.systemPercent,
      flashPercentages.value.freePercent
    ],
    backgroundColor: isDark.value 
      ? ['#60a5fa', '#4ade80', '#fbbf24', '#374151'] 
      : ['#3b82f6', '#22c55e', '#f59e0b', '#e5e7eb'],
    borderWidth: 0
  }]
}))

const ramChartData = computed(() => ({
  labels: ['Utilisé', 'Disponible'],
  datasets: [{
    data: [
      ramPercentages.value.usedPercent,
      ramPercentages.value.freePercent
    ],
    backgroundColor: isDark.value 
      ? ['#a78bfa', '#374151'] 
      : ['#8b5cf6', '#e5e7eb'],
    borderWidth: 0
  }]
}))

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: { display: false },
    tooltip: { 
      enabled: false, // Disable default canvas tooltip
      external: externalTooltipHandler
    }
  },
  cutout: '65%' // Thinner ring like original
}
</script>
