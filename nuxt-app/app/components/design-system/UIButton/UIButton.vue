<template>
  <component
    :is="to ? 'NuxtLink' : 'span'" 
    :to="to"
    class="inline-flex items-center justify-center gap-1.5 rounded-md relative overflow-hidden tracking-wide transition-all duration-200"
    :class="[variantClasses, sizeClasses, (clickable || to) ? 'tag-clickable cursor-pointer' : '', icon ? 'pr-[6px]' : '']"
  >
    <Icon 
      v-if="icon" 
      :name="icon" 
      :class="['w-4 h-4 transition-transform duration-300', iconClass]" 
    />
    <span 
      v-if="$slots.default || label" 
      class="relative z-10 font-medium leading-none"
      :class="{ 'pr-1': icon }"
    >
      <slot>{{ label }}</slot>
    </span>
  </component>
</template>flex flex-wrap items-center gap-4

<script setup lang="ts">
import { computed } from 'vue'

type Variant = 'gray' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'neutral' | 'ghost'
type Size = 'small' | 'middle' | 'large'

interface Props {
  label?: string
  icon?: string
  iconClass?: string | Record<string, boolean>
  variant?: Variant
  size?: Size
  clickable?: boolean
  to?: string
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  icon: '',
  variant: 'gray',
  size: 'small',
  clickable: false,
  to: undefined,
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
    neutral: `
      bg-gray-200 text-gray-700 border-b border-gray-300
      dark:bg-gradient-to-b dark:from-gray-800 dark:to-gray-700 dark:border-t dark:border-b dark:border-t-gray-600/50 dark:border-b-gray-900 dark:text-gray-200
    `,
    ghost: `
      bg-transparent text-gray-600 dark:text-gray-400 border-b border-transparent
      dark:border-t dark:border-b dark:border-transparent
      hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800/50
      active:bg-gray-200 dark:active:bg-gray-800
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
  pointer-events: none;
}

.tag-clickable:hover::before {
  opacity: 1;
}
</style>

