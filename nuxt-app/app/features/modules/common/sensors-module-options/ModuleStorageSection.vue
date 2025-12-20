<template>
  <div>
    <h3 class="text-[13px] text-gray-500 dark:text-white">Stockage BDD</h3>
    <div class="bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm mt-3 p-3">
      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center py-4">
        <div class="animate-spin w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full"></div>
      </div>
      
      <template v-else-if="storageStats">
        <!-- Current size -->
        <div class="flex items-center justify-between mb-2">
          <span class="text-[12px] text-gray-500 font-medium">Espace occupé</span>
          <span class="text-sm font-bold text-blue-600 dark:text-blue-400">{{ formatBytes(storageStats.estimatedSizeBytes) }}</span>
        </div>
        
        <!-- Divider -->
        <div class="h-px bg-gray-200 dark:bg-gray-700 my-2"></div>
        
        <!-- Projections -->
        <div class="flex flex-wrap gap-x-2 text-[10px] text-gray-500 dark:text-gray-400 mt-1">
          <span class="font-mono">{{ formatBytes(projections.daily) }}/j</span>
          <span class="font-mono">{{ formatBytes(projections.monthly) }}/m</span>
          <span class="font-mono">{{ formatBytes(projections.yearly) }}/an</span>
        </div>
      </template>
      
      <div v-else class="text-xs text-gray-400 text-center py-2">
        Non disponible
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { toRef, onMounted, watch } from 'vue'
import { useModuleStorage } from './composables/useModuleStorage'

const props = defineProps<{
  moduleId: string
}>()

const moduleIdRef = toRef(props, 'moduleId')
const { storageStats, projections, loading, fetchStorageStats } = useModuleStorage(moduleIdRef)

onMounted(() => {
  fetchStorageStats()
})

// Refetch if moduleId changes
watch(moduleIdRef, () => {
  fetchStorageStats()
})

// Utility to start formatting bytes
function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}
</script>
