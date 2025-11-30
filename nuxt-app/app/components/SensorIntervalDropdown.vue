<template>
  <div class="relative">
    <button
      :class="[
        'px-1.5 py-0.5 text-[10px] rounded-t transition-colors flex items-center gap-1 uppercase border border-transparent',
        isOpen ? 'bg-gray-800 text-white' : 'text-gray-600 bg-white hover:border-gray-200',
      ]"
      @click.stop="toggleDropdown"
    >
      <Icon name="tabler:refresh" class="w-3 h-3" />
      <span v-if="timeAgo">{{ timeAgo }}</span>
      <span v-else class="text-gray-400">--</span>
    </button>

    <div
      v-if="isOpen"
      class="absolute top-full bg-gray-800 rounded-b-lg shadow-lg p-3 z-50"
      :style="{
        left: '0px',
        width: cardWidth > 0 ? `${cardWidth}px` : 'calc(100vw - 32px)',
        marginTop: '-1px',
      }"
      @click.stop
    >
      <!-- Intervalle Slider -->
      <div class="space-y-2 mb-3">
        <div class="flex justify-between items-center">
          <label class="text-xs font-medium text-gray-300">Intervalle</label>
          <span class="text-xs text-white">{{ localInterval }}s</span>
        </div>
        <input
          v-model.number="localInterval"
          type="range"
          min="10"
          max="300"
          step="10"
          class="w-full h-2 bg-white rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
      </div>

      <!-- Storage Projection -->
      <div class="mb-3 pt-2 border-t border-gray-700">
        <h6 class="text-[10px] font-semibold text-gray-300 mb-1.5 flex items-center gap-1">
          <Icon name="tabler:database" class="w-3 h-3" />
          Impact Stockage
        </h6>
        <div class="space-y-0.5 text-[10px] text-gray-300">
          <div class="flex justify-between">
            <span>1 an (Brut):</span>
            <span class="text-white">{{
              localInterval > 0 ? formatSize(calculateStorage(1, false)) : '--'
            }}</span>
          </div>
          <div class="flex justify-between font-semibold">
            <span>1 an (Comp.):</span>
            <span class="text-white">{{
              localInterval > 0 ? formatSize(calculateStorage(1, true)) : '--'
            }}</span>
          </div>
          <div class="flex justify-between text-gray-400">
            <span>10 ans (Comp.):</span>
            <span class="text-white">{{
              localInterval > 0 ? formatSize(calculateStorage(10, true)) : '--'
            }}</span>
          </div>
        </div>
      </div>

      <!-- Bouton OK -->
      <div class="flex justify-end pt-1">
        <button
          :disabled="saving"
          class="px-2 py-1 bg-blue-600 text-white text-[10px] font-medium rounded hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1"
          @click="handleSave"
        >
          <Icon v-if="saving" name="tabler:loader-2" class="w-3 h-3 animate-spin" />
          {{ saving ? '...' : 'OK' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { formatSize } from '../utils/format'

const props = defineProps({
  timeAgo: { type: String, default: '' },
  initialInterval: { type: Number, default: 60 },
  moduleId: { type: String, default: null },
  sensorKey: { type: String, default: null },
  cardWidth: { type: Number, default: 0 },
})

const emit = defineEmits(['save'])

const isOpen = ref(false)
const localInterval = ref(props.initialInterval)
const saving = ref(false)

// Synchroniser localInterval avec la prop (sauf si le menu est ouvert)
watch(
  () => props.initialInterval,
  val => {
    if (!isOpen.value) {
      localInterval.value = val
    }
  }
)

const toggleDropdown = () => {
  isOpen.value = !isOpen.value
}

const calculateStorage = (years, compressed) => {
  if (!localInterval.value || localInterval.value <= 0) {
    return 0
  }

  const secondsPerYear = 365 * 24 * 3600
  const bytesPerRecord = 37 // Taille moyenne réelle mesurée en production

  const records = (secondsPerYear / localInterval.value) * years
  const totalBytes = records * bytesPerRecord

  return compressed ? totalBytes * 0.1 : totalBytes
}

const handleSave = async () => {
  if (!props.moduleId || !props.sensorKey) return

  saving.value = true
  try {
    const payload = {
      sensors: {
        [props.sensorKey]: { interval: localInterval.value },
      },
    }

    await $fetch(`/api/modules/${encodeURIComponent(props.moduleId)}/config`, {
      method: 'POST',
      body: payload,
    })

    isOpen.value = false
    emit('save', localInterval.value)
  } catch (err) {
    console.error('Erreur sauvegarde config:', err)
    alert('Erreur lors de la sauvegarde')
  } finally {
    saving.value = false
  }
}

// Fermer le dropdown si on clique en dehors
const handleClickOutside = event => {
  const target = event.target
  const dropdown = target.closest('.relative')
  const dropdownContent = target.closest('.absolute.top-full')

  if (!dropdown || (dropdown && !dropdownContent && isOpen.value)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>
