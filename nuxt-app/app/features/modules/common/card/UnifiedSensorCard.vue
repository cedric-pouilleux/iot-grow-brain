<template>
  <!--
    UnifiedSensorCard.vue
    =====================
    Compact sensor card displaying title, value, status, and optional mini chart.
    Refactored to use sub-components for better maintainability.
  -->
  <div
    class="relative rounded-lg group/card dark:border-gray-700 flex flex-col justify-between flex-1 min-w-0 transition-all duration-300"
    :class="[
      isPanelOpen 
        ? openBgClass 
        : 'bg-gray-50 dark:bg-gray-900'
    ]"
  >
    <!-- MINIMALIST MODE -->
    <Transition name="mode-switch" mode="out-in">
      <div 
        v-if="minimalMode" 
        key="minimal" 
        class="p-3 flex flex-col justify-start cursor-pointer"
        @click="$emit('toggle-graph')"
      >
        <!-- Title + Trend Row -->
        <div class="flex items-center gap-1.5">
          <span class="text-sm font-medium" :class="isPanelOpen ? 'text-white' : darkerValueColorClass">{{ currentTitle }}</span>
          <!-- Trend Arrow (next to title) -->
          <Icon
            v-if="activeSensor?.status !== 'missing' && trend !== 'stable'"
            :name="trend === 'up' ? 'tabler:triangle-filled' : 'tabler:triangle-inverted-filled'"
            class="w-2 h-2"
            :class="trendColorClass"
            :title="trendTooltip"
          />
        </div>
        
        <!-- Value + Unit -->
        <div class="flex items-baseline">
          <span class="text-3xl font-bold tracking-tight" :class="isPanelOpen ? 'text-white' : valueColorClass">
            {{ formattedValue }}
          </span>
          <span class="text-base font-medium ml-1" :class="isPanelOpen ? 'text-white/70' : lightValueColorClass">{{ unit }}</span>
        </div>
        
        <!-- Threshold Alert -->
        <SensorCardThreshold v-if="showAlertThresholds" :threshold="thresholdAlert" :isPanelOpen="isPanelOpen" />
      </div>

      <!-- NORMAL MODE -->
      <div v-else key="normal" class="flex flex-col h-full justify-between">
        <div class="pl-2" :class="showCharts && !minimalMode ? 'pb-0' : 'pb-3'">
          <!-- Header Row -->
          <div class="flex justify-between">
            <div class="flex items-center gap-1">
              <Icon
                :name="statusIcon"
                class="w-2.5 h-2.5"
                :class="isPanelOpen ? 'text-white' : statusColor"
                :title="statusTooltip"
              />
              <span :class="isPanelOpen ? 'text-white' : 'text-gray-500 dark:text-white'" class="text-[13px]">{{ currentTitle }}</span>
            </div>

            <div class="flex">
              <SensorDropdown
                :sensors="sensors"
                :activeSensorKey="activeSensorKey"
                :moduleId="moduleId"
                :groupLabel="label"
                :color="color"
                :isPanelOpen="isPanelOpen"
                @select="selectSensor"
              />
            </div>
          </div>

          <!-- Value Display -->
          <SensorCardValue
            :value="rawValue"
            :unit="unit"
            :trend="trend"
            :sensorKey="activeSensorKey"
            :color="color"
            :isPanelOpen="isPanelOpen"
            :showTrend="activeSensor?.status !== 'missing'"
          />
          
          <!-- Threshold Alert -->
          <SensorCardThreshold 
            v-if="showAlertThresholds"
            :threshold="thresholdAlert" 
            :isPanelOpen="isPanelOpen" 
          />
        </div>

        <!-- Mini Chart -->
        <SensorMiniChart
          :history="activeHistory"
          :sensorKey="activeSensorKey"
          :label="label"
          :color="color"
          :isPanelOpen="isPanelOpen"
          :isLoading="isLoading"
          :graphDuration="graphDuration"
          @maximize="$emit('toggle-graph')"
        />
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
/**
 * UnifiedSensorCard - Main card component for sensor display.
 * Uses sub-components for value, threshold, dropdown, and chart.
 */
import { ref, computed, watch } from 'vue'
import type { SensorDataPoint } from '../types'
import { formatValue } from '~/utils/format'
import { useThresholds, useCardColors, useCountUp } from './composables'
import { useChartSettings } from '~/features/modules/common/sensors-module-options/composables'

// Sub-components
import SensorCardValue from './SensorCardValue.vue'
import SensorCardThreshold from './SensorCardThreshold.vue'
import SensorDropdown from './SensorDropdown.vue'
import SensorMiniChart from './SensorMiniChart.vue'

// ============================================================================
// Types
// ============================================================================

interface SensorItem {
  key: string
  label: string
  value?: number
  status?: string
  model?: string
}

interface Props {
  label: string
  sensors: SensorItem[]
  historyMap: Record<string, SensorDataPoint[]>
  moduleId: string
  color: string
  isLoading?: boolean
  initialActiveSensorKey?: string
  graphDuration?: string
  isPanelOpen?: boolean
}

// ============================================================================
// Props & Emits
// ============================================================================

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
  graphDuration: '24h',
  isPanelOpen: false,
})

const emit = defineEmits<{
  'toggle-graph': []
  'update:active-sensor': [key: string]
  'open-options': []
}>()

// ============================================================================
// Color Classes (from composable)
// ============================================================================

const {
  valueColorClass,
  lightValueColorClass,
  darkerValueColorClass,
  openBgClass,
  hoverShadowColor,
} = useCardColors(computed(() => props.color))

// ============================================================================
// Chart & Threshold Settings
// ============================================================================

const { evaluateThreshold, isTrendPositive } = useThresholds()
const { showCharts, showAlertThresholds, minimalMode } = useChartSettings()

// ============================================================================
// State
// ============================================================================

const activeSensorKey = ref(props.initialActiveSensorKey || props.sensors[0]?.key)

// Ensure valid sensor key
if (!props.sensors.find(s => s.key === activeSensorKey.value)) {
  activeSensorKey.value = props.sensors[0]?.key
}

// ============================================================================
// Persist Sensor Selection
// ============================================================================

watch(activeSensorKey, async (newVal) => {
  if (process.client && newVal) {
    emit('update:active-sensor', newVal)
    
    try {
      const prefKey = `sensor-pref-${props.label}`
      await $fetch(`/api/modules/${props.moduleId}/preferences`, {
        method: 'PATCH',
        body: { [prefKey]: newVal }
      })
    } catch (e) {
      console.error('Failed to save preference', e)
    }
  }
}, { immediate: true })

// ============================================================================
// Computed: Active Sensor
// ============================================================================

const activeSensor = computed(() => 
  props.sensors.find(s => s.key === activeSensorKey.value) || props.sensors[0]
)

const activeHistory = computed(() => 
  props.historyMap[activeSensorKey.value] || []
)

// ============================================================================
// Trend Calculation
// ============================================================================

const trend = computed<'up' | 'down' | 'stable'>(() => {
  const history = activeHistory.value
  if (!history || history.length < 6) return 'stable'
  
  const sorted = [...history]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 6)
  
  const recentAvg = (sorted[0].value + sorted[1].value + sorted[2].value) / 3
  const olderAvg = (sorted[3].value + sorted[4].value + sorted[5].value) / 3
  
  const threshold = Math.abs(olderAvg) * 0.01 || 0.5
  const diff = recentAvg - olderAvg
  
  if (diff > threshold) return 'up'
  if (diff < -threshold) return 'down'
  return 'stable'
})

const trendColorClass = computed(() => {
  if (trend.value === 'stable') return 'text-gray-400'
  const isPositive = isTrendPositive(activeSensorKey.value, trend.value)
  if (isPositive === true) return 'text-emerald-500'
  if (isPositive === false) return 'text-red-500'
  return 'text-gray-400'
})

const trendTooltip = computed(() => {
  if (trend.value === 'stable') return ''
  const direction = trend.value === 'up' ? 'En hausse' : 'En baisse'
  const isPositive = isTrendPositive(activeSensorKey.value, trend.value)
  if (isPositive === true) return `${direction} (positif)`
  if (isPositive === false) return `${direction} (négatif)`
  return direction
})

// ============================================================================
// Actions
// ============================================================================

const selectSensor = (key: string) => {
  activeSensorKey.value = key
}

// ============================================================================
// Value Display (for minimalist mode which doesn't use sub-component)
// ============================================================================

const rawValue = computed(() => {
  const sensor = activeSensor.value
  if (!sensor || sensor.status === 'missing' || sensor.value === undefined) {
    return undefined
  }
  return sensor.value
})

const animatedValue = useCountUp(rawValue, { duration: 400, threshold: 0.05 })

const formattedValue = computed(() => {
  if (animatedValue.value === undefined || animatedValue.value === null) {
    return '--'
  }
  return formatValue(animatedValue.value)
})

// ============================================================================
// Unit Helper
// ============================================================================

const getUnit = (sensorKey: string) => {
  if (!sensorKey) return ''
  const k = sensorKey.toLowerCase()
  
  if (k.includes('temp')) return '°C'
  if (k.includes('hum')) return '%'
  if (k.includes('pressure') || k.includes('pression')) return 'hPa'
  if (k === 'co2' || k === 'eco2') return 'ppm'
  if (k === 'co') return 'ppm'
  if (k === 'tvoc') return 'ppb'
  if (k === 'voc') return '/500'
  if (k.includes('pm')) return 'µg/m³'
  
  return ''
}

const unit = computed(() => activeSensor.value ? getUnit(activeSensor.value.key) : '')

// ============================================================================
// Title Logic
// ============================================================================

const currentTitle = computed(() => {
  if (props.label === 'Particules fines' && activeSensor.value?.label) {
    return activeSensor.value.label
  }
  
  if (props.sensors.length <= 1) return props.label
  
  if ((props.label === 'COV' || props.label === 'TCOV') && activeSensor.value?.label) {
    return activeSensor.value.label
  }

  if (props.label === 'Température' || props.label === 'Humidité') {
    return props.label
  }

  if (activeSensor.value?.label && activeSensor.value.label !== props.label) {
    return `${props.label} (${activeSensor.value.label})`
  }
  
  return activeSensor.value?.label || props.label
})

// ============================================================================
// Threshold Alert
// ============================================================================

const thresholdAlert = computed(() => {
  const sensor = activeSensor.value
  if (!sensor) return null
  return evaluateThreshold(sensor.key, sensor.value)
})

// ============================================================================
// Status Display
// ============================================================================

const getSensorStatus = (sensor: SensorItem) => {
  if (sensor.status === 'ok') return { icon: 'tabler:circle-check-filled', color: 'text-green-500', text: 'OK' }
  if (sensor.status === 'missing') return { icon: 'tabler:circle-x-filled', color: 'text-red-500', text: 'Déconnecté' }
  if (sensor.value === undefined || sensor.value === null) return { icon: 'tabler:circle-x-filled', color: 'text-red-500', text: 'Déconnecté' }
  return { icon: 'tabler:circle-check-filled', color: 'text-green-500', text: 'OK' }
}

const currentStatus = computed(() => getSensorStatus(activeSensor.value))
const statusIcon = computed(() => currentStatus.value.icon)
const statusColor = computed(() => currentStatus.value.color)
const statusTooltip = computed(() => {
  const model = activeSensor.value?.model || activeSensor.value?.label || 'Capteur'
  return `${model}: ${currentStatus.value.text}`
})
</script>

<style scoped>
/* Card shadow when open */
.card-open-shadow {
  box-shadow: 0 4px 20px var(--shadow-color);
}

/* Mode switch animation */
.mode-switch-enter-active,
.mode-switch-leave-active {
  transition: all 0.25s ease-out;
}

.mode-switch-enter-from {
  opacity: 0;
  transform: scale(0.98);
}

.mode-switch-leave-to {
  opacity: 0;
  transform: scale(1.02);
}
</style>
