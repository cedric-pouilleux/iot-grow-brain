<template>
  <!--
    HardwareSensorRow.vue
    =====================
    Compact row for hardware sensor with measurements, interval control, and reset button.
    All elements on a single line for maximum density.
  -->
  <div class="flex items-center gap-2">
    
    <!-- Status Indicator -->
    <!-- When disabled: red square. When enabled: normal status dot -->
    <div 
      v-if="!isEnabled"
      class="w-2 h-2 rounded-sm bg-red-500 flex-shrink-0"
      title="Arrêté"
    />
    <div 
      v-else-if="hardware.status !== 'unknown'"
      class="w-2 h-2 rounded-full flex-shrink-0"
      :class="statusClass"
      :title="statusLabel"
    />
    <Icon 
      v-else
      name="tabler:loader" 
      class="w-3 h-3 text-gray-400 animate-spin flex-shrink-0" 
      title="En attente..."
    />
    
    <!-- Hardware Name -->
    <span 
      class="text-xs font-semibold flex-shrink-0" 
      :class="isEnabled ? statusTextClass : 'text-gray-400 dark:text-gray-500'"
    >
      {{ hardware.name }}
    </span>
    
    <!-- Measurement badges (only when enabled) -->
    <div v-if="isEnabled" class="flex items-center gap-1 flex-shrink-0">
      <UITag 
        v-for="m in hardware.measurements" 
        :key="m.key"
        :variant="getVariant(m.status)"
        size="xs"
        :light="true"
      >
        {{ m.label }}
      </UITag>
    </div>
    
    <!-- Spacer -->
    <div class="flex-1"></div>
    
    <!-- Time Counter (only when enabled) -->
    <span v-if="isEnabled" class="text-[10px] text-gray-400 dark:text-gray-300 flex-shrink-0">
      {{ timeAgo || '--' }}
    </span>
    
    <!-- Stop/Play Button -->
    <UITooltip :text="isEnabled ? 'Arrêter le capteur' : 'Démarrer le capteur'">
      <button
        @click="toggleEnabled"
        :disabled="toggling"
        class="p-1 rounded transition-colors flex-shrink-0"
        :class="[
          isEnabled 
            ? 'hover:bg-orange-50 dark:hover:bg-orange-900/30 text-gray-400 dark:text-gray-500 hover:text-orange-500 dark:hover:text-orange-400' 
            : 'hover:bg-green-50 dark:hover:bg-green-900/30 text-green-500 dark:text-green-400 hover:text-green-600 dark:hover:text-green-300',
          { 'opacity-50': toggling }
        ]"
      >
        <Icon :name="toggling ? 'tabler:loader' : (isEnabled ? 'tabler:player-stop' : 'tabler:player-play')" 
              class="w-3.5 h-3.5" 
              :class="{ 'animate-spin': toggling }" />
      </button>
    </UITooltip>
    
    <!-- Reset Button (only when enabled) -->
    <UITooltip v-if="isEnabled" text="Redémarrer le capteur">
      <button
        @click="resetSensor"
        :disabled="resetting"
        class="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors flex-shrink-0"
        :class="{ 'animate-spin': resetting }"
      >
        <Icon :name="resetting ? 'tabler:loader' : 'tabler:refresh'" class="w-3.5 h-3.5" />
      </button>
    </UITooltip>
    
    <!-- Interval Control (disabled when stopped) -->
    <UISlider
      v-model="localInterval"
      :min="10"
      :max="300"
      :step="10"
      suffix="s"
      :disabled="!isEnabled || hardware.status === 'missing'"
      @change="saveInterval"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * HardwareSensorRow - Compact single-line row for hardware sensor
 * Includes reset button for hard reset of stuck sensors
 */
import { ref, computed, watch } from 'vue'
import { useTimeAgo } from '~/composables/useTimeAgo'
import { useSnackbar } from '~/components/design-system/UISnackbar/useSnackbar'
import type { SensorDataPoint } from '../../types'
import UISlider from '~/components/design-system/UISlider/UISlider.vue'
import UITag from '~/components/design-system/UITag/UITag.vue'
import UITooltip from '~/components/design-system/UITooltip/UITooltip.vue'

// ============================================================================
// Types
// ============================================================================

interface Measurement {
  key: string
  label: string
  status: 'ok' | 'missing' | 'unknown' | 'disabled'
  value?: number
}

interface HardwareData {
  hardwareKey: string
  name: string
  measurements: Measurement[]
  interval: number
  status: 'ok' | 'partial' | 'missing' | 'unknown' | 'disabled'
  enabled: boolean  // From backend/ESP32 state
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
const toggling = ref(false)
// Initialize from ESP32-provided enabled state, with localStorage fallback for optimistic updates
const isEnabled = ref(props.hardware.enabled)
const { showSnackbar } = useSnackbar()

// Sync isEnabled when props change (e.g., after ESP32 status update)
watch(() => props.hardware.enabled, (newEnabled) => {
  if (!toggling.value) {
    isEnabled.value = newEnabled
  }
})

// ============================================================================
// Status Display
// ============================================================================

const statusClass = computed(() => {
  switch (props.hardware.status) {
    case 'ok': return 'bg-green-500'
    case 'missing': return 'bg-red-500'
    default: return 'bg-red-500'
  }
})

const statusTextClass = computed(() => {
  switch (props.hardware.status) {
    case 'ok': return 'text-gray-700 dark:text-gray-200'
    case 'missing': return 'text-red-600 dark:text-red-400'
    default: return 'text-red-600 dark:text-red-400'
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

const getVariant = (status: string) => {
  switch (status) {
    case 'ok': return 'success'
    case 'missing': return 'error'
    default: return 'error'
  }
}

// ============================================================================
// Time Ago
// ============================================================================

const timeAgo = useTimeAgo(() => {
  const m = props.hardware.measurements[0]
  if (!m) return null
  
  const measureKey = m.key
  
  // 1. Try composite key
  const compositeKey = `${props.hardware.hardwareKey}:${measureKey}`
  let history = props.sensorHistoryMap?.[compositeKey]
  
  // 2. Fallback to simple key
  if ((!history || history.length === 0) && !measureKey.includes(':')) {
    history = props.sensorHistoryMap?.[measureKey]
  }
  
  if (!history || history.length === 0) return null
  
  // History is sorted ASC (oldest first)
  return history[history.length - 1].time
})

// ============================================================================
// Sync & Save Interval
// ============================================================================

const emit = defineEmits<{
  'interval-change': [hardwareKey: string, interval: number]
}>()

watch(() => props.hardware.interval, (newVal) => {
  localInterval.value = newVal
})

// Emit event immediately when localInterval change (slider drag/release)
watch(localInterval, (newVal) => {
   emit('interval-change', props.hardware.hardwareKey, newVal)
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
        // Use composite keys to decouple hardware configuration
        // e.g. "dht22:temperature" instead of just "temperature"
        const compositeKey = `${props.hardware.hardwareKey}:${m.key}`
        sensorsConfig[compositeKey] = { interval: localInterval.value }
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

// ============================================================================
// Toggle Enable/Disable
// ============================================================================

const toggleEnabled = async () => {
  if (toggling.value) return
  toggling.value = true
  
  const newEnabled = !isEnabled.value
  
  try {
    const response = await $fetch<{ success: boolean; message: string }>(
      `/api/modules/${encodeURIComponent(props.moduleId)}/hardware/enable`,
      {
        method: 'POST',
        body: { 
          hardware: props.hardware.hardwareKey,
          enabled: newEnabled
        }
      }
    )
    
    if (response.success) {
      isEnabled.value = newEnabled
      showSnackbar(`${props.hardware.name} ${newEnabled ? 'activé' : 'arrêté'}`, 'success')
    } else {
      showSnackbar(`Erreur: ${response.message}`, 'error')
    }
  } catch (err) {
    console.error('Failed to toggle hardware:', err)
    showSnackbar(`Erreur ${newEnabled ? 'activation' : 'arrêt'} ${props.hardware.name}`, 'error')
  } finally {
    toggling.value = false
  }
}
</script>


