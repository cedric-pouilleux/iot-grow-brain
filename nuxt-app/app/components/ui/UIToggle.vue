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
      bg-gradient-to-r from-gray-700 to-gray-500
      dark:from-gray-800 dark:to-gray-600
      peer-checked:from-blue-500 peer-checked:to-blue-600
      dark:peer-checked:from-blue-600 dark:peer-checked:to-blue-700
      peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-2
    ">
      <div class="
        absolute top-0.5 left-0.5 w-2.5 h-2.5 rounded
        bg-gradient-to-b from-white via-gray-100 to-gray-300
        dark:from-gray-200 dark:via-gray-400 dark:to-gray-500
        shadow-[0_2px_6px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.8)]
        dark:shadow-[0_2px_6px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.3)]
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
