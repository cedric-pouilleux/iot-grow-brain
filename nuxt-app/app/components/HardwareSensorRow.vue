<template>
  <!--
    HardwareSensorRow.vue
    =====================
    Compact row for hardware sensor with measurements, interval control, and reset button.
    All elements on a single line for maximum density.
  -->
  <div class="px-3 py-2 flex items-center gap-2">
    
    <!-- Status Indicator -->
    <div 
      class="w-2 h-2 rounded-full flex-shrink-0"
      :class="statusClass"
      :title="statusLabel"
    />
    
    <!-- Hardware Name -->
    <span class="text-xs font-semibold text-gray-700 dark:text-gray-200 flex-shrink-0">
      {{ hardware.name }}
    </span>
    
    <!-- Measurement badges -->
    <div class="flex items-center gap-0.5 flex-shrink-0">
      <span 
        v-for="m in hardware.measurements" 
        :key="m.key"
        class="px-1 py-0.5 rounded text-[9px] font-medium"
        :class="getMeasurementClass(m.status)"
      >
        {{ m.label }}
      </span>
    </div>
    
    <!-- Spacer -->
    <div class="flex-1"></div>
    
    <!-- Time Counter (compact) -->
    <span class="text-[10px] text-gray-400 dark:text-gray-300 flex-shrink-0">
      {{ timeAgo || '--' }}
    </span>
    
    <!-- Reset Button -->
    <button
      @click="resetSensor"
      :disabled="resetting"
      class="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors flex-shrink-0"
      :class="{ 'animate-spin': resetting }"
      title="Redémarrer le capteur"
    >
      <Icon :name="resetting ? 'tabler:loader' : 'tabler:refresh'" class="w-3.5 h-3.5" />
    </button>
    
    <!-- Interval Control (glossy slider) -->
    <div class="flex items-center gap-2 flex-shrink-0" :class="{ 'opacity-40': hardware.status === 'missing' }">
      <input
        v-model.number="localInterval"
        type="range"
        min="10"
        max="300"
        step="10"
        :disabled="hardware.status === 'missing'"
        class="interval-slider w-20 h-2 rounded-full"
        :class="hardware.status === 'missing' ? 'cursor-not-allowed' : 'cursor-pointer'"
        @change="saveInterval"
      />
      <span class="text-[11px] w-8 text-right font-medium" :class="hardware.status === 'missing' ? 'text-gray-400 dark:text-gray-600' : 'text-gray-600 dark:text-gray-300'">
        {{ localInterval }}s
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * HardwareSensorRow - Compact single-line row for hardware sensor
 * Includes reset button for hard reset of stuck sensors
 */
import { ref, computed, watch } from 'vue'
import { useTimeAgo } from '../composables/useTimeAgo'
import { useSnackbar } from '../composables/useSnackbar'
import type { SensorDataPoint } from '../types'

// ============================================================================
// Types
// ============================================================================

interface Measurement {
  key: string
  label: string
  status: 'ok' | 'missing' | 'unknown'
  value?: number
}

interface HardwareData {
  hardwareKey: string
  name: string
  measurements: Measurement[]
  interval: number
  status: 'ok' | 'partial' | 'missing'
}

interface Props {
  hardware: HardwareData
  moduleId: string
  sensorHistoryMap?: Record<string, SensorDataPoint[]>
}

// ============================================================================
// Props & State
// ============================================================================

const props = withDefaults(defineProps<Props>(), {
  sensorHistoryMap: () => ({})
})

const localInterval = ref(props.hardware.interval)
const saving = ref(false)
const resetting = ref(false)
const { showSnackbar } = useSnackbar()

// ============================================================================
// Status Display
// ============================================================================

const statusClass = computed(() => {
  switch (props.hardware.status) {
    case 'ok': return 'bg-green-500'
    case 'partial': return 'bg-yellow-500'
    case 'missing': return 'bg-red-500'
    default: return 'bg-gray-300'
  }
})

const statusLabel = computed(() => {
  switch (props.hardware.status) {
    case 'ok': return 'OK'
    case 'partial': return 'Partiel'
    case 'missing': return 'Déconnecté'
    default: return 'Inconnu'
  }
})

const getMeasurementClass = (status: string) => {
  switch (status) {
    case 'ok': return 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400'
    case 'missing': return 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400'
    default: return 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
  }
}

// ============================================================================
// Time Ago
// ============================================================================

const timeAgo = useTimeAgo(() => {
  const firstKey = props.hardware.measurements[0]?.key
  if (!firstKey) return null
  const history = props.sensorHistoryMap?.[firstKey]
  if (!history || history.length === 0) return null
  return history[history.length - 1].time
})

// ============================================================================
// Sync & Save Interval
// ============================================================================

watch(() => props.hardware.interval, (newVal) => {
  localInterval.value = newVal
})

let debounceTimer: ReturnType<typeof setTimeout> | null = null

const saveInterval = async () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  
  debounceTimer = setTimeout(async () => {
    if (saving.value) return
    saving.value = true
    
    try {
      const sensorsConfig: Record<string, { interval: number }> = {}
      for (const m of props.hardware.measurements) {
        sensorsConfig[m.key] = { interval: localInterval.value }
      }
      
      await $fetch(`/api/modules/${encodeURIComponent(props.moduleId)}/config`, {
        method: 'POST',
        body: { sensors: sensorsConfig }
      })
      
      showSnackbar(`${props.hardware.name}: ${localInterval.value}s`, 'success')
    } catch (err) {
      console.error('Failed to save interval:', err)
      showSnackbar('Erreur sauvegarde', 'error')
    } finally {
      saving.value = false
    }
  }, 500)
}

// ============================================================================
// Reset Sensor
// ============================================================================

const resetSensor = async () => {
  if (resetting.value) return
  resetting.value = true
  
  // Use first measurement key as the sensor identifier
  const sensorKey = props.hardware.measurements[0]?.key
  if (!sensorKey) {
    showSnackbar('Aucun capteur à reset', 'error')
    resetting.value = false
    return
  }
  
  showSnackbar(`Reset ${props.hardware.name}...`, 'info')
  
  try {
    const response = await $fetch<{ success: boolean; message: string }>(
      `/api/modules/${encodeURIComponent(props.moduleId)}/reset-sensor`,
      {
        method: 'POST',
        body: { sensor: sensorKey }
      }
    )
    
    if (response.success) {
      showSnackbar(`✓ ${props.hardware.name} reset envoyé`, 'success')
    } else {
      showSnackbar(`Erreur reset: ${response.message}`, 'error')
    }
  } catch (err) {
    console.error('Failed to reset sensor:', err)
    showSnackbar(`Erreur reset ${props.hardware.name}`, 'error')
  } finally {
    resetting.value = false
  }
}
</script>

<style scoped>
/* Glossy Slider Styles */
.interval-slider {
  -webkit-appearance: none;
  appearance: none;
  background: linear-gradient(to right, #374151 0%, #6b7280 100%);
  border-radius: 999px;
  outline: none;
}

/* Dark mode track */
:global(.dark) .interval-slider {
  background: linear-gradient(to right, #1f2937 0%, #4b5563 100%);
}

/* Webkit (Chrome, Safari) thumb */
.interval-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 10px;
  border-radius: 3px;
  background: linear-gradient(180deg, #fff 0%, #e5e7eb 50%, #d1d5db 100%);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: transform 0.15s ease;
}

.interval-slider::-webkit-slider-thumb:hover {
  transform: scale(1.1);
}

:global(.dark) .interval-slider::-webkit-slider-thumb {
  background: linear-gradient(180deg, #e5e7eb 0%, #9ca3af 50%, #6b7280 100%);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

/* Firefox thumb */
.interval-slider::-moz-range-thumb {
  width: 14px;
  height: 10px;
  border: none;
  border-radius: 3px;
  background: linear-gradient(180deg, #fff 0%, #e5e7eb 50%, #d1d5db 100%);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.8);
  cursor: pointer;
}

:global(.dark) .interval-slider::-moz-range-thumb {
  background: linear-gradient(180deg, #e5e7eb 0%, #9ca3af 50%, #6b7280 100%);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.3);
}
</style>
