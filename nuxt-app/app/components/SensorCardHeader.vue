<template>
  <div class="flex flex-col relative z-10 pl-2 pr-2" @click.stop>
    <!-- Header: Label & Controls -->
    <div class="flex justify-between items-start mb-1 pt-2">
      <div class="text-xs text-gray-400">
        {{ label }}
      </div>

      <div class="flex items-center gap-1.5 z-20">
        <!-- Status Pastille with Tooltip -->
        <div class="cursor-help group/status relative flex items-center justify-center">
          <Icon
            v-if="isIncoherent"
            name="tabler:help-circle-filled"
            class="w-4 h-4 text-yellow-500 animate-pulse"
          />
          <Icon
            v-else
            :name="isActive ? 'tabler:circle-check-filled' : 'tabler:circle-x-filled'"
            :class="isActive ? 'w-4 h-4 text-green-500' : 'w-4 h-4 text-red-500'"
          />
          <div
            class="absolute bottom-full right-0 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover/status:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg"
          >
            <span v-if="isIncoherent">Valeur incohérente</span>
            <span v-else>Modèle: {{ sensor?.model || 'N/A' }} {{ sensor?.status === 'ok' ? 'ok' : '' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Valeur Actuelle -->
    <div
      class="text-3xl font-bold leading-none tracking-tight flex items-baseline gap-0.5"
      :class="valueClass"
    >
      {{ formattedValue }}
      <span class="text-lg font-semibold opacity-80">{{ sensorUnit }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatValue } from '../utils/format'

const props = defineProps({
  label: String,
  sensor: Object,
  isActive: Boolean,
  color: { type: String, default: 'gray' },
  isIncoherent: { type: Boolean, default: false },
})

const colorMap = {
  emerald: { text: 'text-emerald-600' },
  orange: { text: 'text-orange-500' },
  blue: { text: 'text-blue-500' },
  violet: { text: 'text-violet-500' },
  pink: { text: 'text-pink-500' },
  cyan: { text: 'text-cyan-500' },
  gray: { text: 'text-gray-400' },
}

const colors = computed(() => colorMap[props.color] || colorMap.gray)
const valueClass = computed(() => (props.isActive ? colors.value.text : 'text-gray-300'))
const formattedValue = computed(() => formatValue(props.sensor?.value))

const sensorUnit = computed(() => {
  const unitMap = {
    CO2: 'ppm',
    Température: '°C',
    Humidité: '%',
    'PM2.5': 'µg/m³',
    COV: 'ppb',
    Pression: 'hPa',
  }
  return unitMap[props.label] || ''
})
</script>
