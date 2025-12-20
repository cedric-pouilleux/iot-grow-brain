<template>
  <div class="flex items-center">
    <!-- Value -->
    <span 
      class="text-3xl font-bold tracking-tight" 
      :class="isPanelOpen ? 'text-white' : valueColorClass"
    >
      {{ formattedValue }}
    </span>
    
    <!-- Trend + Unit stacked vertically -->
    <div class="flex flex-col items-start ml-1 -mb-0.5">
      <!-- Trend Arrow -->
      <Icon
        v-if="showTrend && trend !== 'stable'"
        :name="trend === 'up' ? 'tabler:triangle-filled' : 'tabler:triangle-inverted-filled'"
        class="w-2 h-2"
        :class="trendColorClass"
        :title="trendTooltip"
      />
      <!-- Empty space if no trend to maintain alignment -->
      <div v-else class="w-2.5 h-2.5 -mb-0.5"></div>
      
      <!-- Unit -->  
      <span 
        class="text-sm font-medium" 
        :class="isPanelOpen ? 'text-white/70' : 'text-gray-400 dark:text-gray-400'"
      >
        {{ unit }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCardColors } from '../../composables/useCardColors'
import { useCountUp } from '../../composables/useCountUp'
import { formatValue } from '../../utils/format'
import { useThresholds } from '../../composables/useThresholds'

interface Props {
  value?: number
  unit: string
  trend: 'up' | 'down' | 'stable'
  sensorKey: string
  color: string
  isPanelOpen?: boolean
  showTrend?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isPanelOpen: false,
  showTrend: true,
})

const { isTrendPositive } = useThresholds()
const { valueColorClass } = useCardColors(computed(() => props.color))

// Animated value using countUp effect
const animatedValue = useCountUp(
  computed(() => props.value),
  { duration: 400, threshold: 0.05 }
)

const formattedValue = computed(() => {
  if (animatedValue.value === undefined || animatedValue.value === null) {
    return '--'
  }
  return formatValue(animatedValue.value)
})

// Trend color based on whether trend is good or bad for this sensor type
const trendColorClass = computed(() => {
  if (props.trend === 'stable') return 'text-gray-400'
  
  const isPositive = isTrendPositive(props.sensorKey, props.trend)
  if (isPositive === true) return 'text-emerald-500'
  if (isPositive === false) return 'text-red-500'
  return 'text-gray-400'
})

const trendTooltip = computed(() => {
  if (props.trend === 'stable') return ''
  
  const direction = props.trend === 'up' ? 'En hausse' : 'En baisse'
  const isPositive = isTrendPositive(props.sensorKey, props.trend)
  
  if (isPositive === true) return `${direction} (positif)`
  if (isPositive === false) return `${direction} (négatif)`
  return direction
})
</script>
