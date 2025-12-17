<template>
  <label class="relative inline-flex items-center cursor-pointer">
    <input 
      type="checkbox" 
      :checked="modelValue"
      @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
      class="sr-only peer"
    >
    <div class="
      w-7 h-[14px] rounded-full transition-all
      bg-gradient-to-b from-gray-100 to-gray-300
      dark:from-gray-900 dark:to-gray-800
      border-t border-blue-400/50
      dark:shadow-[0_0_2px_rgba(0,0,0,0.9)]
      peer-checked:from-blue-400 peer-checked:to-blue-600
      dark:peer-checked:from-blue-600 dark:peer-checked:to-blue-800
      peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-2
    ">
      <div class="
        absolute top-[3px] left-0.5 w-2 h-2 rounded-full
        bg-gradient-to-b from-white via-gray-100 to-gray-300
        dark:from-gray-200 dark:via-gray-400 dark:to-gray-500
        shadow-[0_0_4px_rgba(0,0,0,0.4),0_0_8px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.8)]
        dark:shadow-[0_0_4px_rgba(0,0,0,0.6),0_0_8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.3)]
        transition-transform duration-200
      "></div>
    </div>
  </label>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>

<style scoped>
.peer:checked ~ div > div {
  transform: translateX(14px);
}
</style>
