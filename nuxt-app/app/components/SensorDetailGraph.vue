<template>
  <div v-if="selectedSensor" class="mt-4 animate-fade-in">
    <h3 class="font-bold text-gray-700 uppercase text-sm flex items-center gap-2 mb-4">
      <span class="w-2 h-2 rounded-full" :style="{ backgroundColor: sensorColor }"></span>
      {{ sensorLabel }}
    </h3>
    
    <div class="h-80">
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

