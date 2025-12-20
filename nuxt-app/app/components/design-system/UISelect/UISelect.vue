<template>
  <UIDropdown
    :id="id"
    :dropdown-class="'w-full min-w-[100px] bg-white dark:bg-gray-800 rounded-lg shadow-xl mt-1 overflow-hidden border border-gray-200 dark:border-gray-700 z-50 ' + dropdownClass"
    :size="size"
  >
    <template #trigger="{ isOpen, toggle }">
      <button
        type="button"
        class="flex items-center justify-between border transition-colors bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 w-full"
        :class="[
          sizeClasses,
          isOpen ? 'border-blue-500 ring-1 ring-blue-500' : 'hover:border-gray-300 dark:hover:border-gray-500',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        ]"
        @click.stop="!disabled && toggle()"
        :disabled="disabled"
      >
        <span class="font-medium truncate mr-2">{{ displayLabel }}</span>
        <Icon 
          name="tabler:chevron-down" 
          class="transition-transform duration-200 flex-shrink-0"
          :class="[
            iconSizeClass,
            isOpen ? 'rotate-180' : ''
          ]" 
        />
      </button>
    </template>

    <template #content="{ close }">
      <div class="max-h-60 overflow-y-auto py-1">
        <button
          v-for="option in normalizedOptions"
          :key="String(option.value)"
          type="button"
          @click="select(option.value); close()"
          class="w-full text-left transition-colors flex items-center justify-between"
          :class="[
            optionClass,
            isSelected(option.value)
              ? 'bg-gray-100 dark:bg-gray-700 text-blue-600 dark:text-blue-400 font-medium'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
          ]"
        >
          <span class="truncate">{{ option.label }}</span>
          <Icon 
            v-if="isSelected(option.value)" 
            name="tabler:check" 
            class="text-blue-500 flex-shrink-0 ml-2"
            :class="iconSizeClass"
          />
        </button>
      </div>
    </template>
  </UIDropdown>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import UIDropdown from '../UIDropdown/UIDropdown.vue'

// ============================================================================
// Types
// ============================================================================

type Size = 'small' | 'middle' | 'large'

interface Option {
  label: string
  value: string | number
}

interface Props {
  modelValue?: string | number
  options?: (string | number | Option)[]
  placeholder?: string
  size?: Size
  disabled?: boolean
  id?: string
  dropdownClass?: string
}

// ============================================================================
// Props & Emits
// ============================================================================

const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  options: () => [],
  placeholder: 'Sélectionner...',
  size: 'middle',
  disabled: false,
  id: undefined,
  dropdownClass: ''
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
  'change': [value: string | number]
}>()

// ============================================================================
// Computed
// ============================================================================

const normalizedOptions = computed<Option[]>(() => {
  return props.options.map(opt => {
    if (typeof opt === 'object' && opt !== null && 'label' in opt && 'value' in opt) {
      return opt as Option
    }
    return { label: String(opt), value: opt as string | number }
  })
})

const selectedOption = computed(() => {
  return normalizedOptions.value.find(o => o.value === props.modelValue)
})

const displayLabel = computed(() => {
  return selectedOption.value ? selectedOption.value.label : props.placeholder
})

const isSelected = (val: string | number) => {
  return props.modelValue === val
}

// ============================================================================
// Styles
// ============================================================================

const sizeClasses = computed(() => {
  const sizes: Record<Size, string> = {
    small: 'text-[10px] px-2 py-0.5 rounded',
    middle: 'text-[11px] px-2.5 py-1 rounded-md',
    large: 'text-xs px-3 py-1.5 rounded-lg',
  }
  return sizes[props.size]
})

const optionClass = computed(() => {
  const sizes: Record<Size, string> = {
    small: 'text-[10px] px-2 py-1',
    middle: 'text-[11px] px-2.5 py-1.5',
    large: 'text-xs px-3 py-2',
  }
  return sizes[props.size]
})

const iconSizeClass = computed(() => {
  const sizes: Record<Size, string> = {
    small: 'w-3 h-3',
    middle: 'w-3.5 h-3.5',
    large: 'w-4 h-4',
  }
  return sizes[props.size]
})

// ============================================================================
// Actions
// ============================================================================

const select = (value: string | number) => {
  emit('update:modelValue', value)
  emit('change', value)
}
</script>
