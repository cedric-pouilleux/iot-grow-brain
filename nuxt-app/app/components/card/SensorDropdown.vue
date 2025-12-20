<template>
  <UIDropdown
    v-if="sensors.length > 1"
    :id="`sensor-list-${moduleId}-${sensors[0]?.key || 'default'}`"
    position="static"
    :dropdown-class="`left-0 w-full rounded-b-lg rounded-t-none shadow-md overflow-hidden text-sm ${themeBgClass}`"
  >
    <template #trigger="{ isOpen, toggle }">
      <button 
        @click.stop="toggle"
        class="p-1 rounded-tr-lg transition-colors flex items-center group/cta"
        :class="[
          (isOpen || isPanelOpen) ? activeItemBgClass : ctaHoverBgClass,
          isOpen ? 'rounded-b-none' : ''
        ]"
        title="Changer de capteur"
      >
        <Icon 
          name="tabler:cpu" 
          class="w-4 h-4 transition-colors" 
          :class="(isOpen || isPanelOpen) ? 'text-white' : [valueColorClass, 'group-hover/cta:text-white']" 
        />
      </button>
    </template>

    <template #content="{ close }">
      <div class="max-h-48 overflow-hidden">  
        <button
          v-for="(sensor, index) in sensors"
          :key="sensor.key"
          @click="selectSensor(sensor.key, close)"
          class="w-full text-left p-2 flex items-center justify-between transition-colors dropdown-item-animate text-white"
          :class="[activeSensorKey === sensor.key ? activeItemBgClass : hoverBgClass]"
          :style="{ animationDelay: `${index * 50}ms` }"
        >
          <span class="text-xs">
            {{ getItemLabel(sensor) }}
          </span>
          <div class="flex items-center gap-2">
            <span class="font-bold font-mono text-xs text-white">
              {{ formatValue(sensor.value) }}
              <span class="text-xs font-normal text-white/70">{{ getUnit(sensor.key) }}</span>
            </span>
            <Icon 
              :name="getSensorStatus(sensor).icon"
              class="w-3 h-3 text-white" 
            />
          </div>
        </button>
      </div>
    </template>
  </UIDropdown>
  
  <!-- Placeholder to maintain alignment when no dropdown -->
  <div v-else class="w-6 h-6"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import UIDropdown from '../design-system/UIDropdown/UIDropdown.vue'
import { useCardColors } from '../../composables/useCardColors'
import { formatValue } from '../../utils/format'

interface SensorItem {
  key: string
  label: string
  value?: number
  status?: string
  model?: string
}

interface Props {
  sensors: SensorItem[]
  activeSensorKey: string
  moduleId: string
  groupLabel: string
  color: string
  isPanelOpen?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isPanelOpen: false,
})

const emit = defineEmits<{
  'select': [key: string]
}>()

const {
  valueColorClass,
  themeBgClass,
  activeItemBgClass,
  hoverBgClass,
  ctaHoverBgClass,
} = useCardColors(computed(() => props.color))

const selectSensor = (key: string, closeFn?: () => void) => {
  emit('select', key)
  if (closeFn) closeFn()
}

// Get display label for dropdown item
const getItemLabel = (sensor: SensorItem) => {
  // PM sensors: show the PM type (PM1.0, PM2.5, etc.)
  const isPmSensor = props.groupLabel === 'Particules fines' || /^pm\d/.test(sensor.key)
  if (isPmSensor) return sensor.label
  
  // COV group: show model with sensor type
  if (props.groupLabel === 'COV' && sensor.model) {
    return `${sensor.model} (${sensor.label})`
  }
  
  // Others: show just the model name
  return sensor.model || sensor.label
}

// Get unit for sensor
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

// Get sensor status icon
const getSensorStatus = (sensor: SensorItem) => {
  if (sensor.status === 'ok') return { icon: 'tabler:circle-check-filled', color: 'text-green-500' }
  if (sensor.status === 'missing') return { icon: 'tabler:circle-x-filled', color: 'text-red-500' }
  if (sensor.value === undefined || sensor.value === null) return { icon: 'tabler:circle-x-filled', color: 'text-red-500' }
  return { icon: 'tabler:circle-check-filled', color: 'text-green-500' }
}
</script>

<style scoped>
/* Staggered dropdown item animation */
.dropdown-item-animate {
  animation: slideUpFadeIn 0.2s ease-out forwards;
  opacity: 0;
}

@keyframes slideUpFadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
