

<template>
  <div v-if="isOpen" class="border-b border-gray-100 bg-gray-50 p-4 animate-fade-in">
    <div class="flex items-center justify-center gap-6">
      <!-- Hardware -->
      <div class="relative">
        <button
          class="flex items-center justify-center w-10 h-10 bg-white rounded-lg shadow-sm border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          title="Hardware"
          @click="openDropdown = openDropdown === 'hardware' ? null : 'hardware'"
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
                {{ deviceStatus?.hardware?.chip?.cpuFreqMhz || '--' }} MHz
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
          class="flex items-center justify-center w-10 h-10 bg-white rounded-lg shadow-sm border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          title="Réseau"
          @click="openDropdown = openDropdown === 'network' ? null : 'network'"
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
              <span class="font-mono text-gray-800 text-xs">{{
                deviceStatus?.system?.mac || '--'
              }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Stockage -->
      <div class="relative">
        <button
          class="flex items-center justify-center w-10 h-10 bg-white rounded-lg shadow-sm border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          title="Stockage"
          @click="openDropdown = openDropdown === 'storage' ? null : 'storage'"
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
              <span class="text-gray-800"
                >{{ formatSize(deviceStatus?.system?.flash?.usedKb) }} /
                {{ formatSize(deviceStatus?.hardware?.chip?.flashKb) }}</span
              >
            </div>
            <div class="relative w-full h-6 bg-gray-200 rounded overflow-hidden flex">
              <!-- Segments avec labels -->
              <div
                v-if="flashSketchPercent > 0"
                class="bg-blue-500 h-full flex items-center justify-center text-white text-xs font-medium"
                :style="{ width: flashSketchPercent + '%' }"
                :title="`Sketch: ${formatSize(deviceStatus?.system?.flash?.usedKb)}`"
              >
                <span v-if="flashSketchPercent > 8" class="px-1">Sketch</span>
              </div>
              <div
                v-if="flashOtaPercent > 0"
                class="bg-green-500 h-full flex items-center justify-center text-white text-xs font-medium"
                :style="{ width: flashOtaPercent + '%' }"
                :title="`OTA: ${formatSize(deviceStatus?.system?.flash?.freeKb)}`"
              >
                <span v-if="flashOtaPercent > 8" class="px-1">OTA</span>
              </div>
              <div
                v-if="flashSystemPercent > 0"
                class="bg-gray-400 h-full flex items-center justify-center text-white text-xs font-medium"
                :style="{ width: flashSystemPercent + '%' }"
                :title="`Système: ${formatSize(deviceStatus?.system?.flash?.systemKb)}`"
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
              <span class="text-gray-800"
                >{{ formatSize(usedHeap) }} /
                {{ formatSize(deviceStatus?.system?.memory?.heapTotalKb) }}</span
              >
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
          class="flex items-center justify-center w-10 h-10 bg-white rounded-lg shadow-sm border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          title="Configuration"
          @click="openDropdown = openDropdown === 'config' ? null : 'config'"
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
                v-model.number="config.co2"
                type="range"
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
                v-model.number="config.temperature"
                type="range"
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
                v-model.number="config.humidity"
                type="range"
                min="10"
                max="300"
                step="10"
                class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <!-- VOC -->
            <div class="space-y-1">
              <div class="flex justify-between items-center">
                <label class="text-sm font-medium text-gray-700">VOC</label>
                <span class="text-xs text-gray-500">{{ config.voc }}s</span>
              </div>
              <input
                v-model.number="config.voc"
                type="range"
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
                :disabled="saving"
                class="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                @click="saveConfig"
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
import { formatSize } from '../utils/format'
import { getHardwareModel } from '../utils/hardware'
import { calculateStoragePrediction } from '../utils/storage'
import { useStorageCalculations } from '../composables/useStorageCalculations'

const props = defineProps<{
  isOpen: boolean
  deviceStatus: DeviceStatus | null
  formattedUptime: string
  moduleId: string
}>()

// Computed device status ref for composable
const deviceStatusRef = computed(() => props.deviceStatus)

// Use shared storage calculations
const { flashPercentages, ramPercentages } = useStorageCalculations(deviceStatusRef)

// UI state
const openDropdown = ref<'hardware' | 'network' | 'storage' | 'config' | null>(null)

// Watch for panel close to reset dropdown
watch(
  () => props.isOpen,
  (isOpen) => {
    if (!isOpen) {
      openDropdown.value = null
    }
  }
)

// Hardware
const hardwareModel = computed(() => getHardwareModel(props.deviceStatus?.hardware?.chip))

// Flash storage (using shared calculations)
const flashSketchPercent = computed(() => flashPercentages.value.sketchPercent)
const flashOtaPercent = computed(() => flashPercentages.value.otaPercent)
const flashSystemPercent = computed(() => flashPercentages.value.systemPercent)

// RAM (using shared calculations)
const heapUsedPercent = computed(() => ramPercentages.value.usedPercent)
const usedHeap = computed(() => ramPercentages.value.usedKb)

// Click outside handler
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

// Configuration
const config = ref({
  co2: 60,
  temperature: 60,
  humidity: 60,
  voc: 60,
})

const saving = ref(false)

// Watch for sensor config changes
watch(
  () => props.deviceStatus,
  (status) => {
    if (status?.sensorsConfig?.sensors) {
      if (status.sensorsConfig.sensors.co2?.interval)
        config.value.co2 = status.sensorsConfig.sensors.co2.interval
      if (status.sensorsConfig.sensors.temperature?.interval)
        config.value.temperature = status.sensorsConfig.sensors.temperature.interval
      if (status.sensorsConfig.sensors.humidity?.interval)
        config.value.humidity = status.sensorsConfig.sensors.humidity.interval
      if (status.sensorsConfig.sensors.voc?.interval)
        config.value.voc = status.sensorsConfig.sensors.voc.interval
    }
  },
  { immediate: true }
)

// Storage prediction using shared utility
const calculateStorage = (years: number, compressed: boolean) => {
  return calculateStoragePrediction(config.value, years, compressed)
}

// Save configuration
const saveConfig = async () => {
  if (!props.moduleId) return

  saving.value = true
  try {
    const payload = {
      sensors: {
        co2: { interval: config.value.co2 },
        temperature: { interval: config.value.temperature },
        humidity: { interval: config.value.humidity },
        voc: { interval: config.value.voc },
      },
    }

    await $fetch(`/api/modules/${props.moduleId}/config`, {
      method: 'POST',
      body: payload,
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
