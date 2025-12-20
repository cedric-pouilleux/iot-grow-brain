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
            <select 
              v-model="graphDuration"
              class="text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-blue-500"
            >
              <option value="1h">1h</option>
              <option value="6h">6h</option>
              <option value="12h">12h</option>
              <option value="24h">24h</option>
              <option value="7j">7j</option>
            </select>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useChartSettings } from '../../../composables/useChartSettings'
import UIToggle from '../../ui/UIToggle.vue'

const { 
  showCharts, 
  showThresholdLines, 
  colorThresholds, 
  showAlertThresholds, 
  minimalMode,
  graphDuration
} = useChartSettings()
</script>
