<template>
  <UIDropdown
    :id="`interval-${moduleId}-${sensorKeys[0] || 'global'}`"
    dropdown-class="top-full left-0 right-0 -ml-2 bg-gray-800 rounded-b-lg rounded-t-none shadow-xl p-3 text-left"
    position="static"
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


    </template>
  </UIDropdown>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { formatSize } from '../utils/format'
import UIDropdown from './design-system/UIDropdown/UIDropdown.vue'
import { useSnackbar } from '../components/design-system/UISnackbar/useSnackbar'

const props = defineProps({
  initialInterval: { type: Number, default: 60 },
  moduleId: { type: String, default: null },
  sensorKeys: { type: Array, default: () => [] },
})

const emit = defineEmits(['save', 'update:interval'])
const { showSnackbar } = useSnackbar()

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

let debounceTimer = null

const handleSave = async () => {
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

    emit('save', localInterval.value)
    showSnackbar('Intervalle mis à jour', 'success')
  } catch (err) {
    console.error('Erreur sauvegarde config:', err)
    showSnackbar('Erreur lors de la sauvegarde', 'error')
  } finally {
    saving.value = false
  }
}

watch(localInterval, (newVal) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    handleSave()
  }, 1000)
})
</script>
