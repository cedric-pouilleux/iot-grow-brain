<template>
  <div class="relative" :class="{ 'opacity-40': disabled }">
    <!-- Track with value inside -->
    <div class="relative w-20 h-3.5 rounded-full
      bg-gradient-to-r from-gray-700 to-gray-500
      dark:from-gray-800 dark:to-gray-600">
      
      <!-- Value label inside track -->
      <span 
        v-if="showValue"
        class="absolute top-0 h-full flex items-center text-[9px] font-medium text-white/80 pointer-events-none select-none"
        :class="thumbPosition > 50 ? 'left-1.5' : 'right-1.5'"
      >
        {{ modelValue }}{{ suffix }}
      </span>
    </div>
    
    <!-- Invisible range input on top -->
    <input
      :value="modelValue"
      @input="emit('update:modelValue', Number(($event.target as HTMLInputElement).value))"
      @change="emit('change', modelValue)"
      type="range"
      :min="min"
      :max="max"
      :step="step"
      :disabled="disabled"
      class="slider absolute inset-0 w-full h-full rounded-full outline-none
        bg-transparent
        focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      :class="disabled ? 'cursor-not-allowed' : 'cursor-pointer'"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  modelValue: number
  min?: number
  max?: number
  step?: number
  suffix?: string
  showValue?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  min: 0,
  max: 100,
  step: 1,
  suffix: '',
  showValue: true,
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
  'change': [value: number]
}>()

const thumbPosition = computed(() => {
  return ((props.modelValue - props.min) / (props.max - props.min)) * 100
})
</script>

<style scoped>
.slider {
  -webkit-appearance: none;
  appearance: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 10px;
  height: 10px;
  border-radius: 4px;
  background: linear-gradient(180deg, #fff 0%, #e5e7eb 50%, #d1d5db 100%);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: transform 0.15s ease;
}

.slider::-webkit-slider-thumb:hover {
  transform: scale(1.1);
}

:global(.dark) .slider::-webkit-slider-thumb {
  background: linear-gradient(180deg, #e5e7eb 0%, #9ca3af 50%, #6b7280 100%);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.slider::-moz-range-thumb {
  width: 10px;
  height: 10px;
  border: none;
  border-radius: 4px;
  background: linear-gradient(180deg, #fff 0%, #e5e7eb 50%, #d1d5db 100%);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.8);
  cursor: pointer;
}

:global(.dark) .slider::-moz-range-thumb {
  background: linear-gradient(180deg, #e5e7eb 0%, #9ca3af 50%, #6b7280 100%);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.3);
}
</style>
