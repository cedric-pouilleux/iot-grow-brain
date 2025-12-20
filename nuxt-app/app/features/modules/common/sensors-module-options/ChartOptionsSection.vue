<template>
  <div>
    <h3 class="text-[13px] text-gray-500 dark:text-white">Configuration des cartes</h3>
    <div class="bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm p-3 mt-3">
      
      <!-- Minimalist Mode Toggle -->
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs text-gray-500 dark:text-gray-400">Affichage minimaliste</span>
        <UIToggle v-model="minimalMode" />
      </div>
      
      <!-- Alert Thresholds Toggle -->
      <div class="flex items-center justify-between" :class="minimalMode ? '' : 'mb-2'">
        <span class="text-xs text-gray-500 dark:text-gray-400">Seuils d'alerte</span>
        <UIToggle v-model="showAlertThresholds" />
      </div>
      
      <!-- Standard options (hidden when minimal mode is on) -->
      <template v-if="!minimalMode">
        <!-- Show Charts Toggle -->
        <div class="flex items-center justify-between">
          <span class="text-xs text-gray-500 dark:text-gray-400">Afficher les graphiques</span>
          <UIToggle v-model="showCharts" />
        </div>
        
        <!-- Nested Chart Options (only when charts enabled) -->
        <div v-if="showCharts" class="ml-2 mt-1 pl-2 border-l-2 border-gray-200 dark:border-gray-700 space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="text-xs text-gray-500 dark:text-gray-400">Lignes de seuil</span>
            <UIToggle v-model="showThresholdLines" />
          </div>
          <div class="flex items-center justify-between">
            <span class="text-xs text-gray-500 dark:text-gray-400">Couleurs de seuil</span>
            <UIToggle v-model="colorThresholds" />
          </div>
          <div class="flex items-center justify-between">
            <span class="text-xs text-gray-500 dark:text-gray-400">Durée</span>
            <UIDropdown
              id="graph-duration"
              dropdown-class="top-full right-0 w-24 bg-white dark:bg-gray-800 rounded-lg shadow-xl mt-1 overflow-hidden border border-gray-200 dark:border-gray-700 z-50"
              size="small"
            >
              <template #trigger="{ isOpen, toggle, sizeClasses }">
                <button
                  class="flex items-center justify-between border transition-colors bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200"
                  :class="[
                    sizeClasses,
                    isOpen ? 'border-blue-500 ring-1 ring-blue-500' : 'hover:border-gray-300 dark:hover:border-gray-500'
                  ]"
                  @click.stop="toggle"
                >
                  <span class="font-medium">{{ graphDuration }}</span>
                  <Icon name="tabler:chevron-down" class="w-3 h-3 opacity-50" />
                </button>
              </template>
              <template #content="{ close }">
                <div class="py-1">
                  <button
                    v-for="duration in ['1h', '6h', '12h', '24h', '7j']"
                    :key="duration"
                    @click="graphDuration = duration; close()"
                    class="w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center justify-between"
                    :class="graphDuration === duration 
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-medium' 
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'"
                  >
                    {{ duration }}
                    <Icon v-if="graphDuration === duration" name="tabler:check" class="w-3.5 h-3.5 text-blue-500" />
                  </button>
                </div>
              </template>
            </UIDropdown>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useChartSettings } from './composables'
import UIToggle from '~/components/design-system/UIToggle/UIToggle.vue'
import UIDropdown from '~/components/design-system/UIDropdown/UIDropdown.vue'

const { 
  showCharts, 
  showThresholdLines, 
  colorThresholds, 
  showAlertThresholds, 
  minimalMode,
  graphDuration
} = useChartSettings()
</script>
