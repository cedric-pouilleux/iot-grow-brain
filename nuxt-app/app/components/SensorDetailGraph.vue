<template>
  <div v-if="selectedSensor" class="mt-4 bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-fade-in">
    <div class="flex justify-between items-center mb-4">
      <h3 class="font-bold text-gray-700 uppercase text-sm flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
        Historique détaillé : {{ sensorLabel }}
      </h3>
      <button @click="$emit('close')" class="text-gray-400 hover:text-red-500 text-sm">
        Fermer
      </button>
    </div>
    
    <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-200 h-80">
      <SensorChart 
        v-if="history.length > 0"
        :data="history"
        :color="sensorColor"
        :unit="sensorUnit"
      />
      <div v-else class="h-full flex items-center justify-center text-gray-400">
        Pas assez de données pour afficher le graphique détaillé.
      </div>
    </div>
  </div>
</template>

<script setup>
import SensorChart from './SensorChart.vue'

const props = defineProps({
  selectedSensor: { type: String, default: null },
  history: { type: Array, default: () => [] },
  sensorLabel: { type: String, required: true },
  sensorColor: { type: String, required: true },
  sensorUnit: { type: String, required: true }
})

defineEmits(['close'])
</script>

