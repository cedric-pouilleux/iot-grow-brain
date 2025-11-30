<template>
  <div class="mb-6">
    <!-- Loading state -->
    <div v-if="!props.deviceStatus" class="text-center py-8 text-gray-400">
      <div class="animate-spin w-8 h-8 border-2 border-gray-300 border-t-emerald-500 rounded-full mx-auto mb-4"></div>
      Chargement de {{ moduleName }}...
    </div>

    <template v-else-if="props.deviceStatus">
      <!-- ModuleHeader avec menus à droite -->
      <ModuleHeader 
        :module-name="moduleName"
        :rssi="deviceStatus?.system?.rssi"
        :device-status="deviceStatus"
        :formatted-uptime="formatUptime(calculatedUptime)"
      />

      <!-- Grille des Capteurs -->
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
        <SensorMiniCard v-for="type in sensorTypes" :key="type.key"
          :label="type.label" 
          :sensor="getSensorData(type.key)" 
          :color="type.color"
          :history="getSensorHistory(type.key)"
          :is-graph-open="selectedGraphSensor === normalizeSensorType(type.key)"
          :module-id="moduleId"
          :sensor-key="type.key"
          :initial-interval="deviceStatus?.sensorsConfig?.sensors?.[type.key]?.interval || 60"
          @toggle-graph="toggleGraph(type.key)"
        />
      </div>

      <!-- Graphique Détaillé -->
      <SensorDetailGraph
        v-if="selectedGraphSensor"
        :selected-sensor="selectedGraphSensor"
        :history="getSensorHistory(selectedGraphSensor)"
        :sensor-label="getSensorLabel(selectedGraphSensor)"
        :sensor-color="getSensorColor(selectedGraphSensor)"
        :sensor-unit="getSensorUnit(selectedGraphSensor)"
        @close="selectedGraphSensor = null"
      />
    </template>
  </div>
</template>

<script setup>
import ModuleHeader from './ModuleHeader.vue'
import SensorDetailGraph from './SensorDetailGraph.vue'
import { formatUptime } from '../utils/time'
import { getSensorLabel, getSensorColor, getSensorUnit, normalizeSensorType } from '../utils/sensors'

const getSensorData = (sensorName) => {
  const status = props.deviceStatus?.sensors?.[sensorName] || {}
  const config = props.deviceStatus?.sensorsConfig?.[sensorName] || {}
  return {
    ...status,
    ...(config.model && { model: config.model })
  }
}

const selectedGraphSensor = ref(null)

const isToggling = ref(false)

const toggleGraph = (sensorType) => {
  // Protection contre les clics multiples rapides
  if (isToggling.value) return
  
  isToggling.value = true
  const normalizedType = normalizeSensorType(sensorType)
  
  if (selectedGraphSensor.value === normalizedType) {
    selectedGraphSensor.value = null
  } else {
    selectedGraphSensor.value = normalizedType
  }
  
  // Réinitialiser le flag après un court délai
  setTimeout(() => {
    isToggling.value = false
  }, 100)
}

const props = defineProps({
  moduleId: String,
  moduleName: String,
  deviceStatus: {
    type: Object,
    default: null
  },
  sensorData: {
    type: Object,
    default: () => ({ co2: [], temp: [], hum: [] })
  }
})

const sensorTypes = [
  { key: 'co2', label: 'CO2', color: 'emerald' },
  { key: 'temperature', label: 'Température', color: 'orange' },
  { key: 'humidity', label: 'Humidité', color: 'blue' },
  { key: 'pm25', label: 'PM2.5', color: 'violet' },
  { key: 'voc', label: 'COV', color: 'pink' },
  { key: 'pressure', label: 'Pression', color: 'cyan' }
]

const calculatedUptime = computed(() => {
  if (!props.deviceStatus?.system?.uptime_start) return null
  
  const now = Math.floor(Date.now() / 1000)
  const system = props.deviceStatus.system
  
  // Utiliser les valeurs déjà calculées si disponibles
  if (system._config_received_at && system._uptime_start_offset !== undefined) {
    const elapsedSinceConfig = now - system._config_received_at
    return system._uptime_start_offset + elapsedSinceConfig
  }
  
  // Sinon, utiliser directement uptime_start (moins précis mais fonctionne)
  return system.uptime_start
})

const getSensorHistory = (type) => {
  const normalizedType = normalizeSensorType(type)
  if (normalizedType === 'co2') return props.sensorData.co2
  if (normalizedType === 'temp') return props.sensorData.temp
  if (normalizedType === 'hum') return props.sensorData.hum
  return []
}
</script>

