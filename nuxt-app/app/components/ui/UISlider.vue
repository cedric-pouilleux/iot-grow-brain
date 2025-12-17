<template>
  <div class="relative" :class="{ 'opacity-40': disabled }"> 
    <div class="relative w-20 h-3.5 rounded-full
      bg-gradient-to-b from-gray-100 to-gray-300
      dark:from-gray-900 dark:to-gray-800
      border-t border-blue-400/50
      dark:shadow-[0_0_2px_rgba(0,0,0,0.9)]">
      <span 
        v-if="showValue"
        class="absolute top-0 h-full flex items-center text-[9px] font-medium text-white/80 pointer-events-none select-none"
        :class="thumbPosition > 50 ? 'left-1.5' : 'right-1.5'"
      >
        {{ modelValue }}{{ suffix }}
      </span>
    </div>
    <input
      :value="modelValue"
      @input="emit('update:modelValue', Number(($event.target as HTMLInputElement).value))"
      @change="emit('change', modelValue)"
      type="range"
      :min="min"
      :max="max"
      :step="step"
      :disabled="disabled"
      class="slider absolute inset-0 w-[calc(100%-4px)] left-0.5 h-full rounded-full outline-none bg-transparent"
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
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: linear-gradient(180deg, #fff 0%, #e5e7eb 50%, #d1d5db 100%);
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.4), 0 0 8px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: transform 0.15s ease;
}

.slider::-webkit-slider-thumb:hover {
  transform: scale(1.1);
}

:global(.dark) .slider::-webkit-slider-thumb {
  background: linear-gradient(180deg, #e5e7eb 0%, #9ca3af 50%, #6b7280 100%);
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.6), 0 0 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.slider::-moz-range-thumb {
  width: 8px;
  height: 8px;
  border: none;
  border-radius: 50%;
  background: linear-gradient(180deg, #fff 0%, #e5e7eb 50%, #d1d5db 100%);
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.4), 0 0 8px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.8);
  cursor: pointer;
}

:global(.dark) .slider::-moz-range-thumb {
  background: linear-gradient(180deg, #e5e7eb 0%, #9ca3af 50%, #6b7280 100%);
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.6), 0 0 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3);
}
</style>
