<template>
  <!--
    SensorIntervalRow.vue
    =====================
    A single row in the sensor configuration list.
    Displays sensor name, status, time counter, and interval slider.
    
    Used inside ModuleOptionsPanel.vue
  -->
  <div class="p-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
    
    <!-- Status Indicator -->
    <div 
      class="w-2.5 h-2.5 rounded-full flex-shrink-0"
      :class="statusClass"
      :title="statusLabel"
    />
    
    <!-- Sensor Info -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2">
        <span class="text-xs font-medium text-gray-700 truncate">
          {{ sensor.label }}
        </span>
        <span v-if="sensor.model" class="text-[10px] text-gray-400">
          {{ sensor.model }}
        </span>
      </div>
      
      <!-- Time Counter -->
      <div class="text-[10px] text-gray-400 flex items-center gap-1">
        <Icon name="tabler:clock" class="w-3 h-3" />
        <span>{{ timeAgo || 'Pas de données' }}</span>
      </div>
    </div>
    
    <!-- Interval Control -->
    <div class="flex items-center gap-2 flex-shrink-0">
      <input
        v-model.number="localInterval"
        type="range"
        min="10"
        max="300"
        step="10"
        class="w-20 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
        @change="saveInterval"
      />
      <span class="text-xs text-gray-600 font-mono w-10 text-right">
        {{ localInterval }}s
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * SensorIntervalRow
 * 
 * Individual sensor row for the options panel.
 * Handles interval changes with debounced API calls.
 */
import { ref, computed, watch } from 'vue'
import { useTimeAgo } from '../composables/useTimeAgo'
import { useSnackbar } from '../composables/useSnackbar'

// ============================================================================
// Props & Emits
// ============================================================================

interface SensorData {
  key: string
  label: string
  model?: string
  status: 'ok' | 'missing' | 'unknown'
  interval: number
}

interface Props {
  sensor: SensorData
  moduleId: string
  lastUpdate: Date | null
}

const props = defineProps<Props>()

// ============================================================================
// State
// ============================================================================

const localInterval = ref(props.sensor.interval)
const saving = ref(false)
const { showSnackbar } = useSnackbar()

// ============================================================================
// Computed: Status Display
// ============================================================================

const statusClass = computed(() => {
  switch (props.sensor.status) {
    case 'ok': return 'bg-green-500'
    case 'missing': return 'bg-red-500'
    default: return 'bg-gray-300'
  }
})

const statusLabel = computed(() => {
  switch (props.sensor.status) {
    case 'ok': return 'Connecté'
    case 'missing': return 'Déconnecté'
    default: return 'Inconnu'
  }
})

// ============================================================================
// Time Ago
// ============================================================================

const timeAgo = useTimeAgo(() => props.lastUpdate)

// ============================================================================
// Sync with prop changes
// ============================================================================

watch(() => props.sensor.interval, (newVal) => {
  localInterval.value = newVal
})

// ============================================================================
// API: Save Interval
// ============================================================================

let debounceTimer: ReturnType<typeof setTimeout> | null = null

const saveInterval = async () => {
  // Debounce to avoid rapid API calls during slider drag
  if (debounceTimer) clearTimeout(debounceTimer)
  
  debounceTimer = setTimeout(async () => {
    if (saving.value) return
    saving.value = true
    
    try {
      await $fetch(`/api/modules/${encodeURIComponent(props.moduleId)}/config`, {
        method: 'POST',
        body: {
          sensors: {
            [props.sensor.key]: { interval: localInterval.value }
          }
        }
      })
      
      showSnackbar(`${props.sensor.label}: intervalle ${localInterval.value}s`, 'success')
    } catch (err) {
      console.error('Failed to save interval:', err)
      showSnackbar('Erreur lors de la sauvegarde', 'error')
    } finally {
      saving.value = false
    }
  }, 500)
}
</script>
