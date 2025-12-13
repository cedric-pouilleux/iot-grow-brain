<template>
  <div class="mb-6">
    <!-- Loading state -->
    <div v-if="!props.deviceStatus" class="text-center py-8 text-gray-400">
      <div
        class="animate-spin w-8 h-8 border-2 border-gray-300 border-t-emerald-500 rounded-full mx-auto mb-4"
      ></div>
      Chargement de {{ moduleName }}...
    </div>

    <template v-else-if="props.deviceStatus">
      <!-- ModuleHeader avec menus à droite -->
      <ModuleHeader
        :module-name="moduleName"
        :rssi="deviceStatus?.system?.rssi" 
        :device-status="deviceStatus"
        :formatted-uptime="formatUptime(calculatedUptime)"
        v-model:graph-duration="graphDuration"
      />

      <!-- Grille des Capteurs -->
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        <UnifiedSensorCard
          v-for="group in activeGroups"
          :key="group.type"
          :label="group.label"
          :sensors="group.sensors"
          :history-map="getHistoryMap(group)"
          :module-id="moduleId"
          :color="group.color"
          :graph-duration="graphDuration"
          :initial-active-sensor-key="group.initialKey"
          @toggle-graph="toggleGraph(group.sensors[0]?.key)"
        />
      </div>

      <!-- Graphique Détaillé (Legacy / Todo: adapt if needed) -->
      <!-- With new card, graph is inside. Do we still need detailed overlay? -->
      <!-- The user requirement: "Au click sur un item on ouvrira le sensor et l'historique concerné dans la card." -->
      <!-- So maybe we don't need the external detailed graph anymore if the card handles it? -->
      <!-- However, ModulePanel had 'SensorDetailGraph'. UnifiedSensorCard emits 'toggle-graph'. -->
      <!-- Let's keep supporting it for now. -->
      
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

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { DeviceStatus, SensorData, SensorDataPoint } from '../types'
import ModuleHeader from './ModuleHeader.vue'
import SensorDetailGraph from './SensorDetailGraph.vue'
import UnifiedSensorCard from './UnifiedSensorCard.vue'
import { formatUptime } from '../utils/time'
import {
  getSensorLabel,
  getSensorColor,
  getSensorUnit,
  normalizeSensorType,
} from '../utils/sensors'

interface Props {
  moduleId: string
  moduleName: string
  deviceStatus: DeviceStatus | null
  sensorData: SensorData
  isHistoryLoading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  sensorData: () => ({ 
    co2: [], 
    temp: [], 
    hum: [], 
    voc: [], 
    pressure: [], 
    temperature_bmp: [], 
    pm1: [], 
    pm25: [], 
    pm4: [], 
    pm10: [],
    eco2: [],
    tvoc: [],
    temp_sht: [],
    hum_sht: [] 
  }),
  isHistoryLoading: false,
})

// Sensor Groups Definition
const sensorGroupsDefinition = [
  {
    type: 'temperature',
    label: 'Température',
    color: 'orange',
    keys: ['temperature', 'temperature_bmp', 'temp_sht', 'temp']
  },
  {
    type: 'humidity',
    label: 'Humidité',
    color: 'blue',
    keys: ['humidity', 'hum_sht', 'hum']
  },
  { type: 'co2', label: 'CO2', color: 'emerald', keys: ['co2', 'eco2'] },
  { type: 'voc', label: 'COV', color: 'pink', keys: ['voc', 'tvoc'] },
  { type: 'pressure', label: 'Pression', color: 'cyan', keys: ['pressure'] },
  { 
    type: 'pm', 
    label: 'Particules fines', 
    color: 'violet', 
    keys: ['pm1', 'pm25', 'pm4', 'pm10'] 
  },
]

// Helpers
const getSensorData = (sensorName: string) => {
  const status = props.deviceStatus?.sensors?.[sensorName] || {}
  const config = props.deviceStatus?.sensorsConfig?.sensors?.[sensorName] || {}
  return {
    ...status,
    ...(config.model && { model: config.model }),
    ...(config.interval && { interval: config.interval }), // Include interval
  }
}

// Compute available sensors keys for global config
const availableSensorKeys = computed(() => {
  if (!props.deviceStatus?.sensors) return []
  return Object.keys(props.deviceStatus.sensors).filter(k => !k.startsWith('_'))
})

// Compute Active Groups
const activeGroups = computed(() => {
  return sensorGroupsDefinition.map(group => {
        const sensors = group.keys.map(key => {
        const data = getSensorData(key)
        // Heuristic: sensor exists if it has status (even 'missing') or value
        const exists = data.status !== undefined || data.value !== undefined
        if (!exists) return null

        return {
            key,
            label: getSensorLabel(key), // Use utility for individual labels
            model: data.model,
            value: data.value,
            status: data.status,
            interval: data.interval
        }
    }).filter((s): s is NonNullable<typeof s> => s !== null)

    if (sensors.length === 0) return null

    // Determine initial active sensor from preferences
    // Preference key format: "sensor-pref-<Label>" (to match old local storage logic or just Label)
    // Let's use simple Label as key in DB preferences JSON
    const prefKey = `sensor-pref-${group.label}`
    const preferredSensorKey = props.deviceStatus?.preferences?.[prefKey]
    
    // Validate preference exists in current sensors
    const initialKey = (preferredSensorKey && sensors.find(s => s.key === preferredSensorKey)) 
        ? preferredSensorKey 
        : sensors[0]?.key

    return {
        type: group.type,
        label: group.label,
        color: group.color,
        sensors,
        initialKey
    }
  }).filter((g): g is NonNullable<typeof g> => g !== null)
})

const getSensorHistory = (type: string) => {
  const normalizedType = normalizeSensorType(type)
  // Simplified mapping accessing props.sensorData directly with type safety check if possible
  // Using explicit map for safety
  const map: Record<string, SensorDataPoint[]> = {
      co2: props.sensorData.co2,
      temp: props.sensorData.temp,
      hum: props.sensorData.hum,
      voc: props.sensorData.voc,
      pressure: props.sensorData.pressure,
      temperature_bmp: props.sensorData.temperature_bmp,
      pm1: props.sensorData.pm1,
      pm25: props.sensorData.pm25,
      pm4: props.sensorData.pm4,
      pm10: props.sensorData.pm10,
      eco2: props.sensorData.eco2,
      tvoc: props.sensorData.tvoc,
      temp_sht: props.sensorData.temp_sht,
      hum_sht: props.sensorData.hum_sht
  }
  return map[normalizedType] || []
}

// Get history map for a group (all sensors in the group)
const getHistoryMap = (group: any) => {
    const map: Record<string, SensorDataPoint[]> = {}
    group.sensors.forEach((s: any) => {
        map[s.key] = getSensorHistory(s.key)
    })
    return map
}

// Graph Toggle Logic
const selectedGraphSensor = ref<string | null>(null)
const isToggling = ref(false)
const graphDuration = ref('24h')

const toggleGraph = (sensorType: string) => {
  if (isToggling.value) return
  isToggling.value = true
  const normalizedType = normalizeSensorType(sensorType)
  
  if (selectedGraphSensor.value === normalizedType) {
      selectedGraphSensor.value = null
  } else {
      selectedGraphSensor.value = normalizedType
  }
  setTimeout(() => isToggling.value = false, 100)
}

const calculatedUptime = computed(() => {
  if (!props.deviceStatus?.system?.uptimeStart) return null
  const now = Math.floor(Date.now() / 1000)
  const system = props.deviceStatus.system
  if (system._configReceivedAt && system._uptimeStartOffset !== undefined) {
    const elapsedSinceConfig = now - system._configReceivedAt
    return system._uptimeStartOffset + elapsedSinceConfig
  }
  return system.uptimeStart
})
</script>
