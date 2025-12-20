<template>
  <div class="relative inline-flex items-center justify-center group">
    <!-- Trigger Element -->
    <slot />

    <!-- Tooltip Bubble -->
    <div
      class="absolute z-50 px-2 py-1 text-[10px] font-medium text-white bg-gray-900 dark:bg-gray-700 rounded shadow-lg whitespace-nowrap pointer-events-none transition-all duration-300 ease-out opacity-0 blur-sm"
      :class="[
        positionClasses,
        widthClass,
        'group-hover:opacity-100 group-hover:blur-0'
      ]"
    >
      {{ text }}
      
      <!-- Caret / Arrow -->
      <div 
        class="absolute w-0 h-0 border-4 border-transparent"
        :class="arrowClasses"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type Position = 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

const props = withDefaults(defineProps<{
  text: string
  width?: string
  position?: Position
}>(), {
  width: '',
  position: 'top'
})

const widthClass = computed(() => props.width || '')

const positionClasses = computed(() => {
  switch (props.position) {
    case 'top':       return 'bottom-full left-1/2 -translate-x-1/2 mb-1.5'
    case 'top-left':  return 'bottom-full left-0 mb-1.5' // Aligned left edge
    case 'top-right': return 'bottom-full right-0 mb-1.5' // Aligned right edge
    
    case 'bottom':       return 'top-full left-1/2 -translate-x-1/2 mt-1.5'
    case 'bottom-left':  return 'top-full left-0 mt-1.5'
    case 'bottom-right': return 'top-full right-0 mt-1.5'
    
    case 'left':  return 'right-full top-1/2 -translate-y-1/2 mr-1.5'
    case 'right': return 'left-full top-1/2 -translate-y-1/2 ml-1.5'
    
    default: return 'bottom-full left-1/2 -translate-x-1/2 mb-1.5'
  }
})

const arrowClasses = computed(() => {
  const base = 'absolute w-0 h-0 border-4 border-transparent'
  
  switch (props.position) {
    case 'top':
      return 'top-full left-1/2 -translate-x-1/2 border-t-gray-900 dark:border-t-gray-700'
    case 'top-left':
      return 'top-full left-3 border-t-gray-900 dark:border-t-gray-700'
    case 'top-right':
      return 'top-full right-3 border-t-gray-900 dark:border-t-gray-700'
      
    case 'bottom':
      return 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-900 dark:border-b-gray-700'
    case 'bottom-left':
      return 'bottom-full left-3 border-b-gray-900 dark:border-b-gray-700'
    case 'bottom-right':
      return 'bottom-full right-3 border-b-gray-900 dark:border-b-gray-700'
      
    case 'left':
      return 'left-full top-1/2 -translate-y-1/2 border-l-gray-900 dark:border-l-gray-700'
    case 'right':
      return 'right-full top-1/2 -translate-y-1/2 border-r-gray-900 dark:border-r-gray-700'
      
    default:
      return 'top-full left-1/2 -translate-x-1/2 border-t-gray-900 dark:border-t-gray-700'
  }
})
</script>
