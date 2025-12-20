<template>
  <div 
    v-if="threshold && threshold.level !== 'good'" 
    class="flex items-center gap-1"
    :class="{ 'animate-blink': threshold.level === 'hazardous' }"
  >
    <Icon 
      name="tabler:alert-triangle" 
      class="w-3.5 h-3.5" 
      :class="isPanelOpen ? 'text-white' : textColorClass" 
    />
    <span 
      class="text-sm font-bold" 
      :class="isPanelOpen ? 'text-white' : textColorClass"
    >
      {{ threshold.label }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ThresholdResult } from '../../composables/useThresholds'

interface Props {
  threshold: ThresholdResult | null
  isPanelOpen?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isPanelOpen: false,
})

// Threshold text color based on level
const textColorClass = computed(() => {
  if (!props.threshold) return ''
  
  const colorMap: Record<string, string> = {
    good: 'text-emerald-600 dark:text-emerald-400',
    moderate: 'text-amber-600 dark:text-amber-400',
    poor: 'text-orange-600 dark:text-orange-400',
    hazardous: 'text-red-600 dark:text-red-400',
  }
  return colorMap[props.threshold.level] || ''
})
</script>

<style scoped>
/* Blinking animation for hazardous level */
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.animate-blink {
  animation: blink 1s ease-in-out infinite;
}
</style>
