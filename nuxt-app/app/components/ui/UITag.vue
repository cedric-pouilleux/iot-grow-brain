<template>
  <span 
    class="inline-flex items-center rounded-full font-medium border-t relative overflow-hidden"
    :class="[variantClasses, sizeClasses, clickable ? 'tag-clickable' : '']"
  >
    <span class="relative z-10"><slot>{{ label }}</slot></span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type Variant = 'gray' | 'red' | 'amber' | 'green' | 'blue'
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
      bg-gradient-to-b from-gray-300 to-gray-100 border-blue-400/50 text-gray-700
      dark:from-gray-900 dark:to-gray-800 dark:text-gray-300
    `,
    red: `
      bg-gradient-to-b from-red-300 to-red-100 border-red-500/50 text-red-700
      dark:from-red-950 dark:to-red-900 dark:text-red-300
    `,
    amber: `
      bg-gradient-to-b from-amber-300 to-amber-100 border-amber-500/50 text-amber-700
      dark:from-amber-950 dark:to-amber-900 dark:text-amber-300
    `,
    green: `
      bg-gradient-to-b from-green-300 to-green-100 border-green-500/50 text-green-700
      dark:from-green-950 dark:to-green-900 dark:text-green-300
    `,
    blue: `
      bg-gradient-to-b from-blue-300 to-blue-100 border-blue-500/50 text-blue-700
      dark:from-blue-950 dark:to-blue-900 dark:text-blue-300
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

