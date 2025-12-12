<template>
  <AppDropdown
    :id="`interval-${moduleId}-${sensorKeys[0] || 'global'}`"
    dropdown-class="top-full left-0 w-[calc(100%+0.75rem)] -ml-3 bg-gray-800 rounded-b-lg rounded-t-none shadow-xl p-3 text-left"
    class="w-full"
  >
    <template #trigger="{ isOpen }">
      <slot name="trigger" :is-open="isOpen" :current-interval="localInterval">
        <!-- Default Trigger fallback -->
        <button
          class="p-1.5 rounded-t-lg transition-colors flex items-center justify-center gap-1.5 group"
          :class="isOpen ? 'bg-gray-900 text-white' : 'hover:bg-white text-gray-600'"
          title="Fréquence de rafraîchissement"
        >
          <Icon
            name="tabler:clock"
            class="w-4 h-4 transition-colors"
            :class="isOpen ? 'text-white' : 'text-gray-600 group-hover:text-gray-800'"
          />
          <span v-if="localInterval" class="text-xs font-medium" :class="isOpen ? 'text-white' : 'text-gray-500'">
            {{ localInterval }}s
          </span>
        </button>
      </slot>
    </template>

    <template #content="{ close }">
      <!-- Intervalle Slider -->
      <div class="space-y-3 mb-3">
        <div class="flex justify-between items-center">
          <label class="text-xs font-semibold text-gray-300">Intervalle</label>
          <span class="text-xs text-white">{{ localInterval }}s</span>
        </div>
        <input
          v-model.number="localInterval"
          type="range"
          min="10"
          max="300"
          step="10"
          class="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400"
        />
      </div>

      <!-- Storage Projection (Simplified) -->
      <div class="mb-3 pt-2 border-t border-gray-700">
        <div class="flex justify-between items-center text-[10px]">
           <span class="text-gray-400">Stockage (1 an compressé)</span>
           <span class="text-blue-300 font-mono">{{ localInterval > 0 ? formatSize(calculateStorage(1, true)) : '--' }}</span>
        </div>
      </div>

      <!-- Bouton Sauvegarder -->
      <div class="flex justify-end pt-1">
        <button
          :disabled="saving"
          class="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-900/20"
          @click="handleSave(close)"
        >
          <Icon v-if="saving" name="tabler:loader-2" class="w-3.5 h-3.5 animate-spin" />
          <Icon v-else name="tabler:device-floppy" class="w-3.5 h-3.5" />
          {{ saving ? '...' : 'OK' }}
        </button>
      </div>
    </template>
  </AppDropdown>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { formatSize } from '../utils/format'
import AppDropdown from './AppDropdown.vue'

const props = defineProps({
  initialInterval: { type: Number, default: 60 },
  moduleId: { type: String, default: null },
  sensorKeys: { type: Array, default: () => [] },
})

const emit = defineEmits(['save', 'update:interval'])

const localInterval = ref(props.initialInterval)
const saving = ref(false)

const sensorCount = computed(() => props.sensorKeys.length || 1)

// Synchroniser localInterval avec la prop
watch(
  () => props.initialInterval,
  val => {
    localInterval.value = val
  }
)

const calculateStorage = (years, compressed) => {
  if (!localInterval.value || localInterval.value <= 0) {
    return 0
  }

  const secondsPerYear = 365 * 24 * 3600
  const bytesPerRecord = 37 // Taille moyenne réelle mesurée en production

  const records = (secondsPerYear / localInterval.value) * years
  const totalBytes = records * bytesPerRecord * sensorCount.value

  return compressed ? totalBytes * 0.1 : totalBytes
}

const handleSave = async (closeFn) => {
  if (!props.moduleId || props.sensorKeys.length === 0) return

  saving.value = true
  try {
    const sensorsConfig = {}
    props.sensorKeys.forEach(key => {
        sensorsConfig[key] = { interval: localInterval.value }
    })

    const payload = {
      sensors: sensorsConfig,
    }

    await $fetch(`/api/modules/${encodeURIComponent(props.moduleId)}/config`, {
      method: 'POST',
      body: payload,
    })

    if (closeFn) closeFn()
    emit('save', localInterval.value)
  } catch (err) {
    console.error('Erreur sauvegarde config:', err)
    alert('Erreur lors de la sauvegarde: ' + err.message)
  } finally {
    saving.value = false
  }
}
</script>
