<template>
  <div class="flex items-center space-x-2 bg-white p-1 rounded-lg shadow-sm border border-gray-200">
    <button
      v-for="option in options"
      :key="option.value"
      @click="$emit('update:modelValue', option.value)"
      class="px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
      :class="[
        modelValue === option.value
          ? 'bg-emerald-100 text-emerald-700'
          : 'text-gray-600 hover:bg-gray-100'
      ]"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: number
}>()

defineEmits<{
  (e: 'update:modelValue', value: number): void
}>()

const options = [
  { label: '6h', value: 0.25 },
  { label: '24h', value: 1 },
  { label: '7j', value: 7 },
  { label: '30j', value: 30 },
  { label: 'Tout', value: 3650 } // 10 ans (virtuellement tout)
]
</script>
