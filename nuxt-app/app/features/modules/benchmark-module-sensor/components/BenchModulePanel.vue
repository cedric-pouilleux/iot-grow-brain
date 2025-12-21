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
        class="grid gap-4 cards-transition"
        style="grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));"
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
import { computed, ref } from 'vue'
import type { DeviceStatus, SensorData, SensorDataPoint } from '../../common/types'
import BenchModuleHeader from './BenchModuleHeader.vue'
import SensorsModuleOptions from '~/features/modules/common/sensors-module-options/SensorsModuleOptions.vue'
import SensorDetailGraph from '../../common/card/SensorDetailGraph.vue' 
import UnifiedSensorCard from '../../common/card/UnifiedSensorCard.vue'
import { formatUptime } from '~/utils/time'
import {
  getSensorLabel,
  getSensorColor,
  getSensorUnit,
} from '../../common/utils/sensors'
import { getSensorTypeFromKey, getHardwareIdFromKey, getHardware } from '../../common/config/sensors'

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
  sensorData: () => ({}), // Now uses composite keys dynamically
  isHistoryLoading: false,
})

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

// Define groups by sensor_type (the keys come from composite keys now)
const sensorGroupsDefinition = [
  { type: 'temperature', label: 'Température', color: 'orange', sensorTypes: ['temperature'] },
  { type: 'humidity', label: 'Humidité', color: 'blue', sensorTypes: ['humidity'] },
  { type: 'co2', label: 'CO2', color: 'emerald', sensorTypes: ['co2', 'eco2'] },
  { type: 'co', label: 'CO', color: 'amber', sensorTypes: ['co'] },
  { type: 'voc', label: 'COV', color: 'pink', sensorTypes: ['voc', 'tvoc'] },
  { type: 'pressure', label: 'Pression', color: 'cyan', sensorTypes: ['pressure'] },
  { type: 'pm', label: 'Particules fines', color: 'violet', sensorTypes: ['pm1', 'pm25', 'pm4', 'pm10'] },
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
// Pass through sensorData directly (now uses composite keys)
// Pass through sensorData directly (now uses composite keys)
const sensorHistoryMap = computed<Record<string, SensorDataPoint[]>>(() => {
  // console.log('[DEBUG Panel] Sensor Data Keys:', Object.keys(props.sensorData))
  return props.sensorData
})



// ============================================================================
// Computed: Active Groups
// ============================================================================

// Build active groups from both sensorData and deviceStatus
const activeGroups = computed(() => {
  return sensorGroupsDefinition.map(group => {
    // Collect all composite keys from sensorData that match this group
    // Collect all composite keys from sensorData that match this group
    const dataKeys = Object.keys(props.sensorData).filter(compositeKey => {
      const type = getSensorTypeFromKey(compositeKey)
      return group.sensorTypes.includes(type)
    })
    
    // Also check deviceStatus.sensors for sensors that might not have data yet
    const statusSensorTypes = Object.keys(props.deviceStatus?.sensors || {})
      .filter(sensorType => group.sensorTypes.includes(sensorType))
    
    // Create a set of all unique composite keys
    // For status sensors without data, create placeholder keys
    const allKeys = new Set<string>(dataKeys)
    statusSensorTypes.forEach(sensorType => {
      // Find if there's already a composite key for this sensor type
      const hasDataKey = dataKeys.some(k => getSensorTypeFromKey(k) === sensorType)
      if (!hasDataKey) {
        // Add a simple key (will work as fallback)
        allKeys.add(sensorType)
      }
    })
    
    const sensors = Array.from(allKeys).map(compositeKey => {
      const sensorType = getSensorTypeFromKey(compositeKey)
      const hardwareId = getHardwareIdFromKey(compositeKey)
      const hardware = hardwareId ? getHardware(hardwareId) : null
      
      // Find the actual data key - if this is a simple key from status, find matching composite key
      let dataKey = compositeKey
      if (!hardwareId) {
        // This is a simple key from status, find matching composite key in sensorData
        const matchingKey = Object.keys(props.sensorData).find(k => getSensorTypeFromKey(k) === sensorType)
        if (matchingKey) {
          dataKey = matchingKey
        }
      }
      
      // Use dataKey (composite key) for status lookup since ESP32 now publishes with composite keys
      const statusData = getSensorData(dataKey)
      
      // Get the last value from sensorData history (use dataKey for lookup)
      const history = props.sensorData[dataKey] || []
      const lastValue = history.length > 0 ? history[history.length - 1]?.value : statusData.value
      
      // Get hardware name from composite key or from config model
      const hardwareName = hardware?.name || statusData.model
      const sensorLabel = getSensorLabel(sensorType)
      
      // Build display label based on group type
      let displayLabel: string
      if (group.type === 'pm') {
        // PM sensors: just sensor label (PM1.0, PM2.5, etc.)
        displayLabel = sensorLabel
      } else if (group.type === 'co2' || group.type === 'voc') {
        // CO2 and COV: just hardware name
        displayLabel = hardwareName || sensorLabel
      } else if (hardwareName) {
        // Other sensors with hardware: just hardware name
        displayLabel = hardwareName
      } else {
        // Fallback: just sensor label
        displayLabel = sensorLabel
      }
      
      const sensorObj = {
        key: dataKey, // Use the actual data key for history lookup
        label: displayLabel,
        sensorLabel, // Keep pure sensor label for card title
        value: lastValue,
        status: statusData.status,
        interval: statusData.interval
      }

      return sensorObj
    }).filter(s => s !== null)

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
    // Also hide groups where all sensors are disabled
    .filter(g => g.sensors.some(s => s.status !== 'disabled'))
})

// ============================================================================
// History Helpers
// ============================================================================

const getSensorHistory = (key: string) => {
  // Try direct lookup first (works for composite keys like "dht22:temperature")
  const directData = props.sensorData[key]
  if (directData && directData.length > 0) {
    return directData
  }
  
  // If key is not a composite key, search for matching composite key by sensor type
  const sensorType = getSensorTypeFromKey(key)
  if (sensorType === key) {
    // This is a simple key, find matching composite key in sensorData
    const matchingKey = Object.keys(props.sensorData).find(k => getSensorTypeFromKey(k) === sensorType)
    if (matchingKey && props.sensorData[matchingKey]?.length > 0) {
      return props.sensorData[matchingKey]
    }
  }
  
  return []
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
  const normalizedType = getSensorTypeFromKey(sensorType)
  
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
  return group.sensors.some(s => getSensorTypeFromKey(s.key) === selectedGraphSensor.value)
}

/**
 * Find the group that contains the selected sensor for multi-sensor graph
 */
const selectedGraphGroup = computed(() => {
  if (!selectedGraphSensor.value) return null
  return activeGroups.value.find(g => 
    g.sensors.some(s => getSensorTypeFromKey(s.key) === selectedGraphSensor.value)
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

