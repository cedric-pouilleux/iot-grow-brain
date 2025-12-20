<template>
  <span 
    class="inline-flex items-center rounded-full relative overflow-hidden tracking-wide"
    :class="[variantClasses, sizeClasses, clickable ? 'tag-clickable' : '']"
  >
    <span class="relative z-10"><slot>{{ label }}</slot></span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type Variant = 'gray' | 'red' | 'orange' | 'yellow' | 'green' | 'blue'
type Size = 'small' | 'middle' | 'large'

interface Props {
  label?: string
  variant?: Variant
  size?: Size
  clickable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  variant: 'gray',
  size: 'small',
  clickable: false,
})

const sizeClasses = computed(() => {
  const sizes: Record<Size, string> = {
    small: 'p-0.5 px-2 text-[10px]',
    middle: 'px-2.5 py-1 text-[11px]',
    large: 'px-3 py-1 text-xs',
  }
  return sizes[props.size]
})

const variantClasses = computed(() => {
  const variants: Record<Variant, string> = {
    gray: `
      bg-gray-500 text-white border-b border-gray-800
      dark:bg-gradient-to-b dark:from-gray-900 dark:to-gray-800 dark:border-t dark:border-b dark:border-t-blue-400/50 dark:border-b-gray-950 dark:text-white
    `,
    red: `
      bg-red-500 text-white border-b border-red-800
      dark:bg-gradient-to-b dark:from-red-950 dark:to-red-900 dark:border-t dark:border-b dark:border-t-red-500/50 dark:border-b-gray-950 dark:text-white
    `,
    orange: `
      bg-orange-500 text-white border-b border-orange-800
      dark:bg-gradient-to-b dark:from-orange-950 dark:to-orange-900 dark:border-t dark:border-b dark:border-t-orange-500/50 dark:border-b-gray-950 dark:text-white
    `,
    yellow: `
      bg-yellow-500 text-white border-b border-yellow-800
      dark:bg-gradient-to-b dark:from-yellow-900 dark:to-yellow-800 dark:border-t dark:border-b dark:border-t-yellow-500/50 dark:border-b-gray-950 dark:text-white
    `,
    green: `
      bg-green-500 text-white border-b border-green-800
      dark:bg-gradient-to-b dark:from-green-950 dark:to-green-900 dark:border-t dark:border-b dark:border-t-green-500/50 dark:border-b-gray-950 dark:text-white
    `,
    blue: `
      bg-blue-500 text-white border-b border-blue-800
      dark:bg-gradient-to-b dark:from-blue-950 dark:to-blue-900 dark:border-t dark:border-b dark:border-t-blue-500/50 dark:border-b-gray-950 dark:text-white
    `,
  }
  return variants[props.variant]
})
</script>

<style scoped>
.tag-clickable::before {
  content: '';
  position: absolute;
  inset: 0;
  background: inherit;
  background-image: linear-gradient(135deg, var(--tw-gradient-from), var(--tw-gradient-to));
  opacity: 0;
  transition: opacity 0.2s ease;
  border-radius: inherit;
}

.tag-clickable:hover::before {
  opacity: 1;
}
</style>

