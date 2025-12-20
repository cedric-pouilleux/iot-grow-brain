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
    <span class="text-xs font-semibold flex-shrink-0" :class="statusTextClass">
      {{ hardware.name }}
    </span>
    
    <!-- Measurement badges -->
    <div class="flex items-center gap-1 flex-shrink-0">
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
    <UISlider
      v-model="localInterval"
      :min="10"
      :max="300"
      :step="10"
      suffix="s"
      :disabled="hardware.status === 'missing'"
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
import { useTimeAgo } from '../composables/useTimeAgo'
import { useSnackbar } from './design-system/UISnackbar/useSnackbar'
import type { SensorDataPoint } from '../types'
import UISlider from './design-system/UISlider/UISlider.vue'
import UITag from './design-system/UITag/UITag.vue'

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
  const firstKey = props.hardware.measurements[0]?.key
  if (!firstKey) return null
  const history = props.sensorHistoryMap?.[firstKey]
  if (!history || history.length === 0) return null
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


