<template>
  <div class="inline-flex items-stretch rounded bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
    <div
      v-for="(item, index) in items"
      :key="index"
      class="flex items-center relative group"
    >
      <!-- Separator (except for first item) -->
      <div 
        v-if="index > 0" 
        class="w-[1px] h-3/5 bg-gray-200 dark:bg-gray-700 self-center"
      />
      
      <!-- Content Wrapper (handles tooltip if present) -->
      <UITooltip :text="item.tooltip" :disabled="!item.tooltip">
        <div 
          class="px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-default h-full flex items-center"
          :class="{
            'rounded-l': index === 0,
            'rounded-r': index === items.length - 1
          }"
        >
          {{ item.label }}
        </div>
      </UITooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import UITooltip from '../UITooltip/UITooltip.vue'

export interface TagListItem {
  label: string | number
  tooltip?: string
}

defineProps<{
  items: TagListItem[]
}>()
</script>
