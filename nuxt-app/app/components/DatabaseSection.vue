<template>
  <div class="border-t border-gray-100 bg-gray-50 mt-6 rounded-xl overflow-hidden">
    <button 
      @click="isOpen = !isOpen"
      class="w-full p-4 flex items-center justify-between hover:bg-gray-100 transition-colors"
    >
      <div class="flex items-center gap-3">
        <Icon name="tabler:database" class="w-5 h-5 text-gray-600" />
        <h3 class="font-semibold text-gray-700">Base de données</h3>
      </div>
      <Icon 
        :name="isOpen ? 'tabler:chevron-up' : 'tabler:chevron-down'" 
        class="w-5 h-5 text-gray-400"
      />
    </button>
    
    <div v-if="isOpen" class="p-4 bg-white border-t border-gray-100">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        <!-- Info Stockage BDD -->
        <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h4 class="text-xs font-semibold text-gray-500 uppercase mb-3 flex items-center gap-2">
            <Icon name="tabler:server" class="w-4 h-4" />
            Stockage
          </h4>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-600">Taille totale</span>
              <span class="font-mono text-gray-800">{{ dbSize ? formatBytes(dbSize.totalSizeBytes) : '--' }}</span>
            </div>
            <div v-if="dbSize" class="text-xs text-gray-500 italic mt-2">
              Données des capteurs (TimescaleDB)
            </div>
          </div>
        </div>

        <!-- Actions / Historique -->
        <div class="bg-gray-50 rounded-lg p-4 border border-gray-200 flex flex-col justify-center items-center">
           <button 
            @click="showMetricsHistory = !showMetricsHistory"
            class="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2 font-medium text-sm"
          >
            <Icon name="tabler:chart-line" class="w-4 h-4" />
            {{ showMetricsHistory ? 'Masquer' : 'Voir' }} l'historique des métriques
          </button>
        </div>

      </div>

      <!-- Graphique historique -->
      <div v-if="showMetricsHistory" class="mt-4 p-4 bg-white border border-gray-200 rounded-lg animate-fade-in">
        <h4 class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Icon name="tabler:chart-line" class="w-4 h-4" />
          Historique des métriques (30 jours)
        </h4>
        <div v-if="metricsHistory.length > 0">
          <MetricsHistoryChart :history="metricsHistory" />
        </div>
        <div v-else class="h-64 flex items-center justify-center text-gray-400 text-sm">
          <div v-if="isLoadingHistory" class="flex flex-col items-center gap-2">
            <div class="animate-spin w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full"></div>
            <span>Chargement...</span>
          </div>
          <span v-else>Aucune donnée historique disponible</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { GetApiDbSize200, GetApiMetricsHistory200HistoryItem } from '../utils/model'
import { getApiMetricsHistory } from '../utils/api'
import MetricsHistoryChart from './MetricsHistoryChart.vue'

interface Props {
  dbSize: GetApiDbSize200 | null
  metricsHistory: GetApiMetricsHistory200HistoryItem[]
}

const props = withDefaults(defineProps<Props>(), {
  dbSize: null,
  metricsHistory: () => []
})

const emit = defineEmits<{
  'update:metricsHistory': [history: GetApiMetricsHistory200HistoryItem[]]
}>()

const isOpen = ref(false)
const showMetricsHistory = ref(false)
const isLoadingHistory = ref(false)

const formatBytes = (bytes: number | undefined | null): string => {
  if (!bytes && bytes !== 0) return '--'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
}

watch(showMetricsHistory, (show) => {
  if (show && props.metricsHistory.length === 0) {
    loadMetricsHistory()
  }
})

const loadMetricsHistory = async () => {
  isLoadingHistory.value = true
  try {
    const response = await getApiMetricsHistory({ days: '30' })
    if (response.data?.history) {
      emit('update:metricsHistory', response.data.history)
    }
  } catch (e) {
    console.error("Erreur fetch metrics-history:", e)
  } finally {
    isLoadingHistory.value = false
  }
}
</script>
