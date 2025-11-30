<template>
  <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
    <h4 class="text-xs font-semibold text-gray-500 uppercase mb-3 flex items-center gap-2">
      <Icon :name="icon" class="w-4 h-4" />
      {{ title }}
    </h4>
    <div class="space-y-2 text-sm">
      <slot />
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  icon: { type: String, required: true },
})
</script>
