<template>
  <div class="flex flex-col gap-2">
    <!-- Header -->
    <div class="flex items-center justify-between h-5">
      <h3 class="text-sm font-semibold text-gray-500 dark:text-white truncate">
        {{ title }}
      </h3>
      <div v-if="$slots.options" class="flex items-center gap-2">
        <slot name="options" />
      </div>
    </div>
    
    <!-- Content Box -->
    <div class="bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm p-3 h-full">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>
