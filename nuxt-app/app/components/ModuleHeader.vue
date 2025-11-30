<template>
  <div class="py-2 border-b border-gray-100">
    <div class="flex flex-wrap justify-between items-center gap-3">
      <div class="flex items-center gap-2">
        <div class="flex items-center justify-center text-emerald-600">
          <Icon name="tabler:cloud-computing" class="w-4 h-4" />
        </div>
        <h2 class="font-normal text-lg text-gray-500 leading-none" style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">{{ capitalizedModuleName }}</h2>
      </div>
      
      <div class="flex items-center gap-1">
        <!-- Hardware -->
        <div class="relative">
          <button
            @click="openDropdown = openDropdown === 'hardware' ? null : 'hardware'"
            class="p-1.5 rounded-t-lg transition-colors flex items-center justify-center"
            :class="openDropdown === 'hardware' ? 'bg-gray-900' : 'hover:bg-white'"
            title="Hardware"
          >
            <Icon name="tabler:cpu" class="w-4 h-4 transition-colors" :class="openDropdown === 'hardware' ? 'text-white' : 'text-gray-600 hover:text-gray-800'" />
          </button>
          
          <div
            v-if="openDropdown === 'hardware'"
            class="absolute top-full right-0 w-64 bg-gray-800 rounded-b-lg rounded-tl-lg p-4 z-50"
          >
            <div class="space-y-2">
              <div class="flex justify-between items-center">
                <span class="text-xs text-gray-300">Modèle</span>
                <span class="text-xs text-white">
                  {{ hardwareModel }}
                </span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-xs text-gray-300">Fréquence</span>
                    <span class="text-xs text-white">
                  {{ deviceStatus?.hardware?.chip?.cpuFreqMhz || '--' }} MHz
                </span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-xs text-gray-300">Uptime</span>
                <span class="text-xs text-white">{{ formattedUptime }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Réseau -->
        <div class="relative">
          <button
            @click="openDropdown = openDropdown === 'network' ? null : 'network'"
            class="p-1.5 rounded-t-lg transition-colors flex items-center justify-center"
            :class="openDropdown === 'network' ? 'bg-gray-900' : 'hover:bg-white'"
            title="Réseau"
          >
            <Icon name="tabler:network" class="w-4 h-4 transition-colors" :class="openDropdown === 'network' ? 'text-white' : 'text-gray-600 hover:text-gray-800'" />
          </button>
          
          <div
            v-if="openDropdown === 'network'"
            class="absolute top-full right-0 w-64 bg-gray-800 rounded-b-lg rounded-tl-lg p-4 z-50"
          >
            <div class="space-y-2 text-xs">
              <div class="flex justify-between items-center">
                <span class="text-gray-300">IP</span>
                <span class="text-white">{{ deviceStatus?.system?.ip || '--' }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-300">MAC</span>
                <span class="text-white">{{ deviceStatus?.system?.mac || '--' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Stockage -->
        <div class="relative">
          <button
            @click="openDropdown = openDropdown === 'storage' ? null : 'storage'"
            class="p-1.5 rounded-t-lg transition-colors flex items-center justify-center"
            :class="openDropdown === 'storage' ? 'bg-gray-900' : 'hover:bg-white'"
            title="Stockage"
          >
            <Icon name="tabler:device-sd-card" class="w-4 h-4 transition-colors" :class="openDropdown === 'storage' ? 'text-white' : 'text-gray-600 hover:text-gray-800'" />
          </button>
          
          <div
            v-if="openDropdown === 'storage'"
            class="absolute top-full right-0 w-80 bg-gray-800 rounded-b-lg rounded-tl-lg p-4 z-50"
          >
            <!-- Flash -->
            <div class="mb-3">
              <div class="flex items-center"> 
                <span 
                  class="w-12 text-xs text-gray-300 cursor-help group/label relative"
                  :title="`Total: ${formatSize(deviceStatus?.hardware?.chip?.flashKb)} | Utilisé: ${formatSize(flashTotalUsed)}`"
                >
                  Flash
                  <div class="absolute bottom-full left-0 mb-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover/label:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
                    Total: {{ formatSize(deviceStatus?.hardware?.chip?.flashKb) }}<br>
                    Utilisé: {{ formatSize(flashTotalUsed) }}
                  </div>
                </span>
                <div class="flex-1 relative group/bar-flash">
                  <div class="h-4 bg-gray-200 rounded-sm overflow-hidden flex relative">
                    <div 
                      v-if="flashSketchPercent > 0"
                      class="bg-white h-full cursor-help group/sketch flex items-center justify-center"
                      :style="{ width: flashSketchPercent + '%' }"
                      @mouseenter="hoveredSegment = 'sketch'"
                      @mouseleave="hoveredSegment = null"
                    >
                      <span v-if="flashSketchPercent > 8" class="text-gray-800 text-[9px] font-medium uppercase px-1">Sketch</span>
                    </div>
                    <div 
                      v-if="flashOtaPercent > 0"
                      class="bg-gray-100 h-full cursor-help group/ota flex items-center justify-center"
                      :style="{ width: flashOtaPercent + '%' }"
                      @mouseenter="hoveredSegment = 'ota'"
                      @mouseleave="hoveredSegment = null"
                    >
                      <span v-if="flashOtaPercent > 8" class="text-gray-800 text-[9px] font-medium uppercase px-1">OTA</span>
                    </div>
                    <div 
                      v-if="flashSystemPercent > 0"
                      class="bg-gray-200 h-full cursor-help group/sys flex items-center justify-center"
                      :style="{ width: flashSystemPercent + '%' }"
                      @mouseenter="hoveredSegment = 'sys'"
                      @mouseleave="hoveredSegment = null"
                    >
                      <span v-if="flashSystemPercent > 8" class="text-gray-800 text-[9px] font-medium uppercase px-1">Sys</span>
                    </div>
                    <div 
                      v-if="flashFreePercent > 0"
                      class="bg-gray-300 h-full cursor-help group/free flex items-center justify-center"
                      :style="{ width: flashFreePercent + '%' }"
                      @mouseenter="hoveredSegment = 'free'"
                      @mouseleave="hoveredSegment = null"
                    >
                      <span v-if="flashFreePercent > 8" class="text-gray-800 text-[9px] font-medium uppercase px-1">Libre</span>
                    </div>
                  </div>
                  <!-- Tooltips Flash - positionnés en dehors de la barre -->
                  <div 
                    v-if="flashSketchPercent > 0 && hoveredSegment === 'sketch'"
                    class="absolute bottom-full mb-1 px-2 py-1 bg-gray-900 text-white text-sm rounded whitespace-nowrap z-[100] shadow-lg"
                    :style="{ left: (flashSketchPercent / 2) + '%', transform: 'translateX(-50%)' }"
                  >
                    Sketch: {{ formatSize(deviceStatus?.system?.flash?.usedKb) }}
                  </div>
                  <div 
                    v-if="flashOtaPercent > 0 && hoveredSegment === 'ota'"
                    class="absolute bottom-full mb-1 px-2 py-1 bg-gray-900 text-white text-sm rounded whitespace-nowrap z-[100] shadow-lg"
                    :style="{ left: (flashSketchPercent + flashOtaPercent / 2) + '%', transform: 'translateX(-50%)' }"
                  >
                    OTA: {{ formatSize(deviceStatus?.system?.flash?.freeKb) }}
                  </div>
                  <div 
                    v-if="flashSystemPercent > 0 && hoveredSegment === 'sys'"
                    class="absolute bottom-full mb-1 px-2 py-1 bg-gray-900 text-white text-sm rounded whitespace-nowrap z-[100] shadow-lg"
                    :style="{ left: (flashSketchPercent + flashOtaPercent + flashSystemPercent / 2) + '%', transform: 'translateX(-50%)' }"
                  >
                    Système: {{ formatSize(deviceStatus?.system?.flash?.systemKb) }}
                  </div>
                  <div 
                    v-if="flashFreePercent > 0 && hoveredSegment === 'free'"
                    class="absolute bottom-full mb-1 px-2 py-1 bg-gray-900 text-white text-sm rounded whitespace-nowrap z-[100] shadow-lg"
                    :style="{ left: (flashSketchPercent + flashOtaPercent + flashSystemPercent + flashFreePercent / 2) + '%', transform: 'translateX(-50%)' }"
                  >
                    Libre: {{ formatSize(flashFreeSpace) }}
                  </div>
                </div>
              </div>
            </div>

            <!-- RAM -->
            <div>
              <div class="flex items-center">
                <span 
                  class="w-12 text-xs text-gray-300 cursor-help group/label relative"
                  :title="`Total: ${formatSize(deviceStatus?.system?.memory?.heapTotalKb)} | Utilisé: ${formatSize(usedHeap)}`"
                >
                  RAM
                  <div class="absolute bottom-full left-0 mb-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover/label:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
                    Total: {{ formatSize(deviceStatus?.system?.memory?.heapTotalKb) }}<br>
                    Utilisé: {{ formatSize(usedHeap) }}
                  </div>
                </span>
                <div class="flex-1 relative group/bar-ram">
                  <div class="h-4 bg-gray-200 rounded-sm overflow-hidden flex relative">
                    <div 
                      class="bg-white h-full cursor-help group/used flex items-center justify-center"
                      :style="{ width: heapUsedPercent + '%' }"
                      @mouseenter="hoveredRamSegment = 'used'"
                      @mouseleave="hoveredRamSegment = null"
                    >
                      <span v-if="heapUsedPercent > 10" class="text-gray-800 text-[9px] font-medium uppercase px-1">Utilisé</span>
                    </div>
                    <div 
                      v-if="heapFreePercent > 0"
                      class="bg-gray-300 h-full cursor-help group/free flex items-center justify-center"
                      :style="{ width: heapFreePercent + '%' }"
                      @mouseenter="hoveredRamSegment = 'free'"
                      @mouseleave="hoveredRamSegment = null"
                    >
                      <span v-if="heapFreePercent > 10" class="text-gray-800 text-[9px] font-medium uppercase px-1">Libre</span>
                    </div>
                  </div>
                  <!-- Tooltips RAM - positionnés en dehors de la barre -->
                  <div 
                    v-if="hoveredRamSegment === 'used'"
                    class="absolute bottom-full mb-1 px-2 py-1 bg-gray-900 text-white text-sm rounded whitespace-nowrap z-[100] shadow-lg"
                    :style="{ left: (heapUsedPercent / 2) + '%', transform: 'translateX(-50%)' }"
                  >
                    Utilisé: {{ formatSize(usedHeap) }}
                  </div>
                  <div 
                    v-if="heapFreePercent > 0 && hoveredRamSegment === 'free'"
                    class="absolute bottom-full mb-1 px-2 py-1 bg-gray-900 text-white text-sm rounded whitespace-nowrap z-[100] shadow-lg"
                    :style="{ left: (heapUsedPercent + heapFreePercent / 2) + '%', transform: 'translateX(-50%)' }"
                  >
                    Libre: {{ formatSize(deviceStatus?.system?.memory?.heapFreeKb) }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="relative group/rssi cursor-help flex items-center justify-center">
          <Icon :name="wifiIcon" class="w-6 h-6" :class="rssiClass" />
          <div class="absolute top-full right-0 mt-1 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover/rssi:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
            Signal: {{ rssi || '--' }} dBm
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DeviceStatus } from '../types'
import { formatUptime } from '../utils/time'

const props = defineProps<{
  moduleName: string
  rssi: number | null | undefined
  deviceStatus: DeviceStatus | null
  formattedUptime: string
}>()

const capitalizedModuleName = computed(() => {
  if (!props.moduleName) return ''
  return props.moduleName.charAt(0).toUpperCase() + props.moduleName.slice(1)
})

const openDropdown = ref<'hardware' | 'network' | 'storage' | null>(null)
const hoveredSegment = ref<'sketch' | 'ota' | 'sys' | 'free' | null>(null)
const hoveredRamSegment = ref<'used' | 'free' | null>(null)

const rssiClass = computed(() => {
  const rssi = props.rssi
  if (!rssi) return 'text-gray-400'
  if (rssi > -50) return 'text-green-600' // Excellent
  if (rssi > -60) return 'text-green-500' // Très bon
  if (rssi > -70) return 'text-yellow-500' // Bon
  if (rssi > -80) return 'text-orange-500' // Moyen
  return 'text-red-500' // Faible
})

const wifiIcon = computed(() => {
  const rssi = props.rssi
  if (!rssi) return 'tabler:wifi-off'
  if (rssi > -60) return 'tabler:wifi'
  if (rssi > -75) return 'tabler:wifi-2'
  if (rssi > -85) return 'tabler:wifi-1'
  return 'tabler:wifi-0'
})

const formatSize = (kb: number | undefined | null): string => {
  if (kb === null || kb === undefined) return '--'
  if (kb < 1024) return kb + ' KB'
  if (kb < 1024 * 1024) return (kb / 1024).toFixed(1) + ' MB'
  return (kb / (1024 * 1024)).toFixed(2) + ' GB'
}

const hardwareModel = computed(() => {
  const model = props.deviceStatus?.hardware?.chip?.model || '--'
  const rev = props.deviceStatus?.hardware?.chip?.rev
  if (rev) {
    return `${model} [Rev ${rev}]`
  }
  return model
})

// Flash calculations
const flashTotalUsed = computed(() => {
  const used = props.deviceStatus?.system?.flash?.usedKb || 0
  const sys = props.deviceStatus?.system?.flash?.systemKb || 0
  return used + sys
})

const flashSketchPercent = computed(() => {
  const total = props.deviceStatus?.hardware?.chip?.flashKb
  const used = props.deviceStatus?.system?.flash?.usedKb
  if (!total || !used) return 0
  return (used / total) * 100
})

const flashOtaPercent = computed(() => {
  const total = props.deviceStatus?.hardware?.chip?.flashKb
  const free = props.deviceStatus?.system?.flash?.freeKb
  if (!total || !free) return 0
  return (free / total) * 100
})

const flashSystemPercent = computed(() => {
  const total = props.deviceStatus?.hardware?.chip?.flashKb
  const sys = props.deviceStatus?.system?.flash?.systemKb
  if (!total || !sys) return 0
  return (sys / total) * 100
})

const flashFreePercent = computed(() => {
  const total = props.deviceStatus?.hardware?.chip?.flashKb
  const used = props.deviceStatus?.system?.flash?.usedKb || 0
  const sys = props.deviceStatus?.system?.flash?.systemKb || 0
  const ota = props.deviceStatus?.system?.flash?.freeKb || 0
  if (!total) return 0
  const usedTotal = used + sys + ota
  const free = total - usedTotal
  if (free <= 0) return 0
  return (free / total) * 100
})

const flashFreeSpace = computed(() => {
  const total = props.deviceStatus?.hardware?.chip?.flashKb || 0
  const used = props.deviceStatus?.system?.flash?.usedKb || 0
  const sys = props.deviceStatus?.system?.flash?.systemKb || 0
  const ota = props.deviceStatus?.system?.flash?.freeKb || 0
  const usedTotal = used + sys + ota
  return total - usedTotal
})

// RAM calculations
const usedHeap = computed(() => {
  const total = props.deviceStatus?.system?.memory?.heapTotalKb
  const free = props.deviceStatus?.system?.memory?.heapFreeKb
  if (!total || free === undefined) return 0
  return total - free
})

const heapUsedPercent = computed(() => {
  const total = props.deviceStatus?.system?.memory?.heapTotalKb
  if (!total || !usedHeap.value) return 0
  return (usedHeap.value / total) * 100
})

const heapFreePercent = computed(() => {
  const total = props.deviceStatus?.system?.memory?.heapTotalKb
  if (!total) return 0
  return 100 - heapUsedPercent.value
})

// Fermer le dropdown si on clique en dehors
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.relative')) {
    openDropdown.value = null
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>
