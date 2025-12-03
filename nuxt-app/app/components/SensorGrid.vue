<template>
  <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
    <SensorMiniCard
      v-for="sensor in sensors"
      :key="sensor.key"
      :label="sensor.label"
      :sensor="getSensorData(sensor.key)"
      :color="sensor.color"
      :history="getHistory(sensor.key)"
      :is-graph-open="isGraphOpen(sensor.key)"
      :module-id="moduleId"
      :sensor-key="sensor.key"
      :initial-interval="deviceStatus?.sensorsConfig?.sensors?.[sensor.key]?.interval || 60"
      :open-dropdown-id="openDropdownId"
      @toggle-graph="toggleGraph(sensor.key)"
      @dropdown-opened="handleDropdownOpened"
    />
  </div>
</template>

<script setup>
import SensorMiniCard from './SensorMiniCard.vue'

const props = defineProps({
  sensors: { type: Array, required: true },
  selectedGraphSensor: { type: String, default: null },
  deviceStatus: { type: Object, default: null },
  sensorData: { type: Object, default: () => ({ co2: [], temp: [], hum: [], voc: [], pressure: [], temperature_bmp: [] }) },
  moduleId: { type: String, default: null },
})

const emit = defineEmits(['toggle-graph'])

const openDropdownId = ref(null)

const handleDropdownOpened = sensorKey => {
  // Si null, fermer tous les dropdowns
  if (!sensorKey) {
    openDropdownId.value = null
  } else {
    openDropdownId.value = sensorKey
  }
}

const getSensorData = sensorName => {
  const status = props.deviceStatus?.sensors?.[sensorName] || {}
  const config = props.deviceStatus?.sensorsConfig?.[sensorName] || {}
  return {
    ...status,
    ...(config.model && { model: config.model }),
  }
}

const getHistory = type => {
  // Mapping des clés de capteurs vers les clés de données
  const typeMap = {
    co2: 'co2',
    temperature: 'temp',
    humidity: 'hum',
    temp: 'temp',
    hum: 'hum',
    voc: 'voc',
    pressure: 'pressure',
    temperature_bmp: 'temperature_bmp',
  }
  const dataKey = typeMap[type] || type
  return props.sensorData?.[dataKey] || []
}

const isGraphOpen = sensorKey => {
  // Normaliser pour la comparaison
  const normalizedKey =
    sensorKey === 'temperature' ? 'temp' : sensorKey === 'humidity' ? 'hum' : sensorKey
  return props.selectedGraphSensor === normalizedKey
}

const toggleGraph = sensorType => {
  emit('toggle-graph', sensorType)
}
</script>
