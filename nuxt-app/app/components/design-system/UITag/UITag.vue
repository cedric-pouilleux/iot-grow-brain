<template>
  <span
    class="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-medium border transition-colors shadow-sm"
    :class="[
      variantClasses,
      sizeClasses,
      clickable ? 'cursor-pointer hover:opacity-80 active:scale-95' : ''
    ]"
    @click="clickable ? $emit('click', $event) : null"
  >
    <slot name="icon-left"></slot>
    <span :class="{ 'ml-1': $slots['icon-left'], 'mr-1': $slots['icon-right'] }">
      <slot>{{ label }}</slot>
    </span>
    <slot name="icon-right"></slot>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  label?: string | number
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'neutral' | 'blue'
  size?: 'xs' | 'sm' | 'md'
  clickable?: boolean
  outlined?: boolean
}>(), {
  variant: 'neutral',
  size: 'xs',
  clickable: false,
  outlined: false
})

defineEmits<{
  'click': [event: MouseEvent]
}>()

const variantClasses = computed(() => {
  if (props.outlined) {
    switch (props.variant) {
      case 'primary': return 'border-blue-500 text-blue-600 dark:text-blue-400 bg-transparent'
      case 'success': return 'border-green-500 text-green-600 dark:text-green-400 bg-transparent'
      case 'warning': return 'border-orange-500 text-orange-600 dark:text-orange-400 bg-transparent'
      case 'error':   return 'border-red-500 text-red-600 dark:text-red-400 bg-transparent'
      case 'blue':    return 'border-blue-500 text-blue-600 dark:text-blue-400 bg-transparent'
      default:        return 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 bg-transparent'
    }
  }

  // Glossy / Filled style
  switch (props.variant) {
    case 'primary': return 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
    case 'success': return 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'
    case 'warning': return 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800'
    case 'error':   return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
    case 'blue':    return 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border-blue-100 dark:border-blue-800'
    default:        return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
  }
})

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm': return 'text-xs px-2 py-0.5'
    case 'md': return 'text-sm px-2.5 py-1'
    default:   return 'text-[10px] px-1.5 py-0.5' // xs (default)
  }
})
</script>
