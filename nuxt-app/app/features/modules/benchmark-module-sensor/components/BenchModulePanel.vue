<template>
  <!--
    BenchModulePanel.vue
    ====================
    Main panel for benchmark-module-sensor.
    
    Uses:
    - ModuleLayout for structure
    - BenchModuleHeader for header
    - SensorsModuleOptions for options
    - Sensor cards from common/card
  -->
  <div class="mb-6">
    <!-- Loading state -->
    <div v-if="!props.deviceStatus" class="text-center py-8 text-gray-400">
      <div
        class="animate-spin w-8 h-8 border-2 border-gray-300 border-t-emerald-500 rounded-full mx-auto mb-4"
      ></div>
      Chargement de {{ moduleName }}...
    </div>

    <template v-else-if="props.deviceStatus">
      <!-- Header with options toggle -->
      <BenchModuleHeader
        :module-name="moduleName"
        :module-id="moduleId"
        :zone-name="deviceStatus?.zoneName"
        :rssi="deviceStatus?.system?.rssi" 
        :device-status="deviceStatus"
        :formatted-uptime="formatUptime(calculatedUptime)"
        :options-panel-open="optionsPanelOpen"
        @toggle-options="optionsPanelOpen = !optionsPanelOpen"
      />

      <!-- Options Panel -->
      <SensorsModuleOptions
        :is-open="optionsPanelOpen"
        :device-status="deviceStatus"
        :module-id="moduleId"
        :sensor-history-map="sensorHistoryMap"
        @zone-changed="$emit('zone-changed')"
        @open-zone-drawer="$emit('open-zone-drawer', moduleId)"
      />

      <!-- Sensor Cards Grid with slide animation -->
      <div 
        class="flex gap-4 cards-transition"
        :class="{ 'cards-pushed': optionsPanelOpen }"
      >
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
          :is-panel-open="isCardPanelOpen(group)"
          @toggle-graph="toggleGraph(group.sensors[0]?.key, activeSensorByGroup[group.type] || group.initialKey)"
          @update:active-sensor="handleActiveSensorChange(group.type, $event)"
          @open-options="optionsPanelOpen = true"
        />
      </div>

      <!-- Detailed Graph Overlay with multi-sensor support -->
      <SensorDetailGraph
        v-if="selectedGraphSensor"
        :selected-sensor="selectedGraphSensor"
        :initial-active-sensor="selectedGraphActiveSensor"
        :history="getSensorHistory(selectedGraphSensor)"
        :sensor-label="selectedGraphGroup?.label || getSensorLabel(selectedGraphSensor)"
        :sensor-color="getSensorColor(selectedGraphSensor)"
        :sensor-unit="getSensorUnit(selectedGraphSensor)"
        :available-sensors="selectedGraphAvailableSensors"
        :sensor-history-map="selectedGraphHistoryMap"
        @close="selectedGraphSensor = null"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * BenchModulePanel
 * 
 * Benchmark sensor module panel using:
 * - BenchModuleHeader for header
 * - SensorsModuleOptions for options
 * - Unified sensor cards
 */
import { computed, ref } from 'vue'
import type { DeviceStatus, SensorData, SensorDataPoint } from '~/types'
import BenchModuleHeader from './BenchModuleHeader.vue'
import SensorsModuleOptions from '~/features/modules/common/sensors-module-options/SensorsModuleOptions.vue'
import SensorDetailGraph from '@module-card/SensorDetailGraph.vue'
import UnifiedSensorCard from '@module-card/UnifiedSensorCard.vue'
import { formatUptime } from '~/utils/time'
import {
  getSensorLabel,
  getSensorColor,
  getSensorUnit,
  normalizeSensorType,
} from '~/utils/sensors'

// ============================================================================
// Props
// ============================================================================

interface Props {
  moduleId: string
  moduleName: string
  deviceStatus: DeviceStatus | null
  sensorData: SensorData
  isHistoryLoading?: boolean
}

const emit = defineEmits<{
  (e: 'zone-changed'): void
  (e: 'open-zone-drawer', moduleId: string): void
}>()

const props = withDefaults(defineProps<Props>(), {
  sensorData: () => ({ 
    co2: [], 
    co: [],
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

// ============================================================================
// State
// ============================================================================

const optionsPanelOpen = ref(false)
const selectedGraphSensor = ref<string | null>(null)
const selectedGraphActiveSensor = ref<string | null>(null) // Active sensor from card to pre-select
const isToggling = ref(false)

import { useChartSettings } from '~/features/modules/common/sensors-module-options/composables'
const { graphDuration } = useChartSettings()

// Track active sensor per group type (updated by UnifiedSensorCard)
const activeSensorByGroup = reactive<Record<string, string>>({})

// Handler for when a card changes its active sensor
const handleActiveSensorChange = (groupType: string, sensorKey: string) => {
  activeSensorByGroup[groupType] = sensorKey
}

// ============================================================================
// Sensor Groups Definition
// ============================================================================

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
  { type: 'co', label: 'CO', color: 'amber', keys: ['co'] },
  { type: 'voc', label: 'COV', color: 'pink', keys: ['voc', 'tvoc'] },
  { type: 'pressure', label: 'Pression', color: 'cyan', keys: ['pressure'] },
  { 
    type: 'pm', 
    label: 'Particules fines', 
    color: 'violet', 
    keys: ['pm1', 'pm25', 'pm4', 'pm10'] 
  },
]

// ============================================================================
// Computed: Sensor Data Access
// ============================================================================

const getSensorData = (sensorName: string) => {
  const status = props.deviceStatus?.sensors?.[sensorName] || {}
  const config = props.deviceStatus?.sensorsConfig?.sensors?.[sensorName] || {}
  return {
    ...status,
    ...(config.model && { model: config.model }),
    ...(config.interval && { interval: config.interval }),
  }
}

/**
 * Flat map of sensor key -> latest history array.
 * Used by ModuleOptionsPanel for time counters.
 */
const sensorHistoryMap = computed<Record<string, SensorDataPoint[]>>(() => {
  return {
    co2: props.sensorData.co2,
    co: props.sensorData.co,
    temp: props.sensorData.temp,
    temperature: props.sensorData.temp,
    hum: props.sensorData.hum,
    humidity: props.sensorData.hum,
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
})

// ============================================================================
// Computed: Active Groups
// ============================================================================

const activeGroups = computed(() => {
  return sensorGroupsDefinition.map(group => {
    const sensors = group.keys.map(key => {
      const data = getSensorData(key)
      const exists = data.status !== undefined || data.value !== undefined
      if (!exists) return null

      return {
        key,
        label: getSensorLabel(key),
        model: data.model,
        value: data.value,
        status: data.status,
        interval: data.interval
      }
    }).filter((s): s is NonNullable<typeof s> => s !== null)

    if (sensors.length === 0) return null

    // Determine initial active sensor from preferences
    const prefKey = `sensor-pref-${group.label}`
    const preferredSensorKey = props.deviceStatus?.preferences?.[prefKey]
    
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

// ============================================================================
// History Helpers
// ============================================================================

const getSensorHistory = (type: string) => {
  const normalizedType = normalizeSensorType(type)
  const map: Record<string, SensorDataPoint[]> = {
    co2: props.sensorData.co2,
    co: props.sensorData.co,
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

const getHistoryMap = (group: any) => {
  const map: Record<string, SensorDataPoint[]> = {}
  group.sensors.forEach((s: any) => {
    map[s.key] = getSensorHistory(s.key)
  })
  return map
}

// ============================================================================
// Graph Toggle
// ============================================================================

const toggleGraph = (sensorType: string, activeSensorKey?: string) => {
  if (isToggling.value) return
  isToggling.value = true
  const normalizedType = normalizeSensorType(sensorType)
  
  if (selectedGraphSensor.value === normalizedType) {
    selectedGraphSensor.value = null
    selectedGraphActiveSensor.value = null
  } else {
    selectedGraphSensor.value = normalizedType
    selectedGraphActiveSensor.value = activeSensorKey || sensorType
  }
  setTimeout(() => isToggling.value = false, 100)
}

/**
 * Check if a card's panel is open (its sensor is selected for detail graph)
 */
const isCardPanelOpen = (group: { sensors: { key: string }[] }) => {
  if (!selectedGraphSensor.value) return false
  return group.sensors.some(s => normalizeSensorType(s.key) === selectedGraphSensor.value)
}

/**
 * Find the group that contains the selected sensor for multi-sensor graph
 */
const selectedGraphGroup = computed(() => {
  if (!selectedGraphSensor.value) return null
  return activeGroups.value.find(g => 
    g.sensors.some(s => normalizeSensorType(s.key) === selectedGraphSensor.value)
  ) || null
})

/**
 * Get available sensors for the selected graph (from the group)
 */
const selectedGraphAvailableSensors = computed(() => {
  return selectedGraphGroup.value?.sensors || []
})

/**
 * Get sensor history map for the selected graph group
 */
const selectedGraphHistoryMap = computed<Record<string, SensorDataPoint[]>>(() => {
  if (!selectedGraphGroup.value) return {}
  return getHistoryMap(selectedGraphGroup.value)
})

// ============================================================================
// Uptime Calculation
// ============================================================================

const calculatedUptime = computed(() => {
  const bootedAt = props.deviceStatus?.system?.bootedAt
  if (!bootedAt) return null
  
  // Calculate uptime as seconds since boot
  const bootTime = new Date(bootedAt).getTime()
  const now = Date.now()
  return Math.floor((now - bootTime) / 1000)
})
</script>

<style scoped>
/* Cards slide down first (fast) */
.cards-transition {
  transition: transform 0.1s linear;
}

/* Options panel - simple linear transition */
.options-panel-transition {
  transition: all 0.3s linear;
}
</style>

