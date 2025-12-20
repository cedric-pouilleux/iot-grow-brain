<template>
  <label class="relative inline-flex items-center cursor-pointer">
    <input 
      type="checkbox" 
      :checked="modelValue"
      @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
      class="sr-only peer"
    >
    <div 
      class="rounded transition-all
      bg-gray-700 peer-checked:bg-blue-600
      dark:bg-gradient-to-b dark:from-gray-900 dark:to-gray-800
      dark:border-t dark:border-blue-400/50
      dark:shadow-[0_0_2px_rgba(0,0,0,0.9)]
      dark:peer-checked:from-blue-600 dark:peer-checked:to-blue-800
      peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-2"
      :class="containerSizeClass"
    >
      <div 
        class="toggle-thumb absolute rounded-sm
        bg-gradient-to-b from-white via-gray-100 to-gray-200
        dark:from-gray-200 dark:via-gray-400 dark:to-gray-500
        shadow-[0_0_4px_rgba(0,0,0,0.4),0_0_8px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.8)]
        dark:shadow-[0_0_4px_rgba(0,0,0,0.6),0_0_8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.3)]
        transition-transform duration-200"
        :class="[thumbSizeClass, modelValue ? translateClass : 'translate-x-0']"
      ></div>
    </div> 
  </label>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type Size = 'small' | 'medium' | 'large'

const props = withDefaults(defineProps<{
  modelValue: boolean
  size?: Size
}>(), {
  size: 'medium'
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const containerSizeClass = computed(() => {
  const sizes: Record<Size, string> = {
    small: 'w-7 h-[14px]',
    medium: 'w-9 h-5',
    large: 'w-11 h-6'
  }
  return sizes[props.size]
})

const thumbSizeClass = computed(() => {
  // Define width, height, top, left for each size
  const sizes: Record<Size, string> = {
    small: 'w-2 h-2 top-[3px] left-[3px]',
    medium: 'w-3.5 h-3.5 top-[3px] left-[3px]',
    large: 'w-5 h-5 top-[2px] left-[2px]'
  }
  return sizes[props.size]
})

const translateClass = computed(() => {
  const translates: Record<Size, string> = {
    small: 'translate-x-[14px]',
    medium: 'translate-x-[16px]',
    large: 'translate-x-[20px]'
  }
  return translates[props.size]
})
</script>

