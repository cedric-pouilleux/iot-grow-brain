<template>
  <div v-if="isOpen" class="border-b border-gray-100 bg-gray-50 p-4 animate-fade-in">
    <div class="flex items-center justify-center gap-6">
      
      <!-- Hardware -->
      <div class="relative">
        <button
          @click="openDropdown = openDropdown === 'hardware' ? null : 'hardware'"
          class="flex items-center justify-center w-10 h-10 bg-white rounded-lg shadow-sm border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          title="Hardware"
        >
          <Icon name="tabler:cpu" class="w-5 h-5" />
        </button>
        
        <div
          v-if="openDropdown === 'hardware'"
          class="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50"
        >
          <h4 class="text-xs font-semibold text-gray-500 uppercase mb-3">Hardware</h4>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-600">Modèle</span>
              <span class="font-mono text-gray-800 text-xs">
                {{ hardwareModel }}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Fréquence</span>
              <span class="font-mono text-gray-800">
                {{ deviceStatus?.hardware?.chip?.cpu_freq_mhz || '--' }} MHz
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Uptime</span>
              <span class="font-mono text-gray-800">{{ formattedUptime }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Réseau -->
      <div class="relative">
        <button
          @click="openDropdown = openDropdown === 'network' ? null : 'network'"
          class="flex items-center justify-center w-10 h-10 bg-white rounded-lg shadow-sm border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          title="Réseau"
        >
          <Icon name="tabler:network" class="w-5 h-5" />
        </button>
        
        <div
          v-if="openDropdown === 'network'"
          class="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50"
        >
          <h4 class="text-xs font-semibold text-gray-500 uppercase mb-3">Réseau</h4>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-600">IP</span>
              <span class="font-mono text-gray-800">{{ deviceStatus?.system?.ip || '--' }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">MAC</span>
              <span class="font-mono text-gray-800 text-xs">{{ deviceStatus?.system?.mac || '--' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Stockage -->
      <div class="relative">
        <button
          @click="openDropdown = openDropdown === 'storage' ? null : 'storage'"
          class="flex items-center justify-center w-10 h-10 bg-white rounded-lg shadow-sm border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          title="Stockage"
        >
          <Icon name="tabler:device-sd-card" class="w-5 h-5" />
        </button>
        
        <div
          v-if="openDropdown === 'storage'"
          class="absolute top-full left-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50"
        >
          <h4 class="text-xs font-semibold text-gray-500 uppercase mb-3">Stockage</h4>
          
          <!-- Flash -->
          <div class="mb-4">
            <div class="flex justify-between text-xs mb-2">
              <span class="text-gray-600">Flash</span>
              <span class="text-gray-800">{{ formatSize(deviceStatus?.system?.flash?.used_kb) }} / {{ formatSize(deviceStatus?.hardware?.chip?.flash_kb) }}</span>
            </div>
            <div class="relative w-full h-6 bg-gray-200 rounded overflow-hidden flex">
              <!-- Segments avec labels -->
              <div 
                v-if="flashSketchPercent > 0"
                class="bg-blue-500 h-full flex items-center justify-center text-white text-xs font-medium"
                :style="{ width: flashSketchPercent + '%' }"
                :title="`Sketch: ${formatSize(deviceStatus?.system?.flash?.used_kb)}`"
              >
                <span v-if="flashSketchPercent > 8" class="px-1">Sketch</span>
              </div>
              <div 
                v-if="flashOtaPercent > 0"
                class="bg-green-500 h-full flex items-center justify-center text-white text-xs font-medium"
                :style="{ width: flashOtaPercent + '%' }"
                :title="`OTA: ${formatSize(deviceStatus?.system?.flash?.free_kb)}`"
              >
                <span v-if="flashOtaPercent > 8" class="px-1">OTA</span>
              </div>
              <div 
                v-if="flashSystemPercent > 0"
                class="bg-gray-400 h-full flex items-center justify-center text-white text-xs font-medium"
                :style="{ width: flashSystemPercent + '%' }"
                :title="`Système: ${formatSize(deviceStatus?.system?.flash?.system_kb)}`"
              >
                <span v-if="flashSystemPercent > 8" class="px-1">Sys</span>
              </div>
            </div>
            <!-- Légende -->
            <div class="flex gap-3 mt-2 text-xs text-gray-600">
              <div class="flex items-center gap-1">
                <div class="w-3 h-3 bg-blue-500 rounded"></div>
                <span>Sketch</span>
              </div>
              <div class="flex items-center gap-1">
                <div class="w-3 h-3 bg-green-500 rounded"></div>
                <span>OTA</span>
              </div>
              <div class="flex items-center gap-1">
                <div class="w-3 h-3 bg-gray-400 rounded"></div>
                <span>Système</span>
              </div>
            </div>
          </div>

          <!-- RAM -->
          <div>
            <div class="flex justify-between text-xs mb-2">
              <span class="text-gray-600">RAM</span>
              <span class="text-gray-800">{{ formatSize(usedHeap) }} / {{ formatSize(deviceStatus?.system?.memory?.heap_total_kb) }}</span>
            </div>
            <div class="relative w-full h-6 bg-gray-200 rounded overflow-hidden">
              <div 
                class="bg-purple-500 h-full flex items-center justify-center text-white text-xs font-medium"
                :style="{ width: heapUsedPercent + '%' }"
              >
                <span v-if="heapUsedPercent > 10" class="px-1">Utilisé</span>
              </div>
            </div>
            <!-- Légende -->
            <div class="flex gap-3 mt-2 text-xs text-gray-600">
              <div class="flex items-center gap-1">
                <div class="w-3 h-3 bg-purple-500 rounded"></div>
                <span>Utilisé</span>
              </div>
              <div class="flex items-center gap-1">
                <div class="w-3 h-3 bg-gray-200 rounded"></div>
                <span>Libre</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- Configuration -->
      <div class="relative">
        <button
          @click="openDropdown = openDropdown === 'config' ? null : 'config'"
          class="flex items-center justify-center w-10 h-10 bg-white rounded-lg shadow-sm border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          title="Configuration"
        >
          <Icon name="tabler:settings" class="w-5 h-5" />
        </button>
        
        <div
          v-if="openDropdown === 'config'"
          class="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50"
        >
          <h4 class="text-xs font-semibold text-gray-500 uppercase mb-3">Configuration Capteurs</h4>
          
          <div class="space-y-4">
            <!-- CO2 -->
            <div class="space-y-1">
              <div class="flex justify-between items-center">
                <label class="text-sm font-medium text-gray-700">CO2</label>
                <span class="text-xs text-gray-500">{{ config.co2 }}s</span>
              </div>
              <input 
                type="range" 
                v-model.number="config.co2" 
                min="10" 
                max="300" 
                step="10"
                class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <!-- Temperature -->
            <div class="space-y-1">
              <div class="flex justify-between items-center">
                <label class="text-sm font-medium text-gray-700">Température</label>
                <span class="text-xs text-gray-500">{{ config.temperature }}s</span>
              </div>
              <input 
                type="range" 
                v-model.number="config.temperature" 
                min="10" 
                max="300" 
                step="10"
                class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <!-- Humidity -->
            <div class="space-y-1">
              <div class="flex justify-between items-center">
                <label class="text-sm font-medium text-gray-700">Humidité</label>
                <span class="text-xs text-gray-500">{{ config.humidity }}s</span>
              </div>
              <input 
                type="range" 
                v-model.number="config.humidity" 
                min="10" 
                max="300" 
                step="10"
                class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <!-- Storage Prediction -->
            <div class="bg-blue-50 p-3 rounded-md border border-blue-100 mt-4">
              <h5 class="text-xs font-semibold text-blue-800 mb-2 flex items-center gap-1">
                <Icon name="tabler:database" class="w-3 h-3" />
                Impact Stockage (Estimé)
              </h5>
              <div class="space-y-1 text-xs text-blue-700">
                <div class="flex justify-between">
                  <span>1 an (Brut):</span>
                  <span class="font-mono">{{ formatSize(calculateStorage(1, false)) }}</span>
                </div>
                <div class="flex justify-between font-semibold">
                  <span>1 an (Compressé):</span>
                  <span class="font-mono">{{ formatSize(calculateStorage(1, true)) }}</span>
                </div>
                <div class="flex justify-between text-blue-600/70">
                  <span>10 ans (Compressé):</span>
                  <span class="font-mono">{{ formatSize(calculateStorage(10, true)) }}</span>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex justify-end pt-2">
              <button 
                @click="saveConfig"
                :disabled="saving"
                class="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                <Icon v-if="saving" name="tabler:loader-2" class="w-3 h-3 animate-spin" />
                {{ saving ? 'Enregistrement...' : 'Appliquer' }}
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import type { DeviceStatus } from '../types'

const props = defineProps<{
  isOpen: boolean
  deviceStatus: DeviceStatus | null
  formattedUptime: string
  moduleId: string
}>()

const openDropdown = ref<'hardware' | 'network' | 'storage' | 'config' | null>(null)

watch(() => props.isOpen, (isOpen) => {
  if (!isOpen) {
    openDropdown.value = null
  }
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

const flashSketchPercent = computed(() => {
  const total = props.deviceStatus?.hardware?.chip?.flash_kb
  const used = props.deviceStatus?.system?.flash?.used_kb
  if (!total || !used) return 0
  return (used / total) * 100
})

const flashOtaPercent = computed(() => {
  const total = props.deviceStatus?.hardware?.chip?.flash_kb
  const free = props.deviceStatus?.system?.flash?.free_kb
  if (!total || !free) return 0
  return (free / total) * 100
})

const flashSystemPercent = computed(() => {
  const total = props.deviceStatus?.hardware?.chip?.flash_kb
  const sys = props.deviceStatus?.system?.flash?.system_kb
  if (!total || !sys) return 0
  return (sys / total) * 100
})

const usedHeap = computed(() => {
  const total = props.deviceStatus?.system?.memory?.heap_total_kb
  const free = props.deviceStatus?.system?.memory?.heap_free_kb
  if (!total || free === undefined) return 0
  return total - free
})

const heapUsedPercent = computed(() => {
  const total = props.deviceStatus?.system?.memory?.heap_total_kb
  if (!total || !usedHeap.value) return 0
  return (usedHeap.value / total) * 100
})

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

const config = ref({
  co2: 60,
  temperature: 60,
  humidity: 60
})

const saving = ref(false)

watch(() => props.deviceStatus, (status) => {
  if (status?.sensorsConfig?.sensors) {
    if (status.sensorsConfig.sensors.co2?.interval) config.value.co2 = status.sensorsConfig.sensors.co2.interval
    if (status.sensorsConfig.sensors.temperature?.interval) config.value.temperature = status.sensorsConfig.sensors.temperature.interval
    if (status.sensorsConfig.sensors.humidity?.interval) config.value.humidity = status.sensorsConfig.sensors.humidity.interval
  }
}, { immediate: true })

const calculateStorage = (years: number, compressed: boolean) => {
  const secondsPerYear = 365 * 24 * 3600
  const bytesPerRecord = 37
  
  const recordsCo2 = secondsPerYear / config.value.co2
  const recordsTemp = secondsPerYear / config.value.temperature
  const recordsHum = secondsPerYear / config.value.humidity
  
  const totalRecords = (recordsCo2 + recordsTemp + recordsHum) * years
  const totalBytes = totalRecords * bytesPerRecord
  
  return compressed ? totalBytes * 0.1 : totalBytes
}

const saveConfig = async () => {
  if (!props.moduleId) return
  
  saving.value = true
  try {
    const payload = {
      sensors: {
        co2: { interval: config.value.co2 },
        temperature: { interval: config.value.temperature },
        humidity: { interval: config.value.humidity }
      }
    }
    
    await $fetch(`/api/modules/${props.moduleId}/config`, {
      method: 'POST',
      body: payload
    })
    
    openDropdown.value = null
  } catch (err) {
    console.error('Erreur sauvegarde config:', err)
    alert('Erreur lors de la sauvegarde de la configuration')
  } finally {
    saving.value = false
  }
}
</script>
