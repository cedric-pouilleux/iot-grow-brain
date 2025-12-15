<template>
  <!-- 
    ModuleOptionsPanel.vue
    =====================
    Collapsible panel for module configuration, displayed between header and sensor cards.
    
    Left section: Device info (hardware, network, storage)
    Right section: Hardware sensors list with measurements and interval sliders
    
    Sensors are grouped by physical hardware (e.g., BMP280, DHT22, SPS30)
    with one interval control per hardware sensor.
  -->
  <Transition name="slide">
    <div 
      v-if="isOpen" 
      class="overflow-hidden"   
    >
      <div class="grid grid-cols-6 gap-4 mb-4 items-stretch">
        
        <!-- LEFT: Informations (1 col) -->
        <div class="col-span-6 lg:col-span-1 flex flex-col space-y-3">
          <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Informations
          </h3>
          
          <div class="bg-white rounded-lg shadow-sm border border-gray-100 p-3 flex flex-col justify-between flex-grow">
            <!-- Hardware Section -->
            <div>
              <div class="flex items-center justify-between mb-1">
                <span class="text-[10px] font-medium text-gray-500 uppercase">Hardware</span>
                <div 
                  class="w-2.5 h-2.5 rounded-full cursor-help"
                  :class="isOnline ? 'bg-green-500' : 'bg-red-500'"
                  :title="'Uptime: ' + formattedUptime"
                ></div>
              </div>
              <div class="text-xs space-y-0.5">
                <div class="text-gray-800 capitalize">{{ moduleId }}</div>
                <div class="text-gray-600">{{ hardwareModel }}</div>
                <div class="text-gray-500">CPU : {{ cpuFreq }} MHz</div>
              </div>
            </div>
            
            <!-- Network Section -->
            <div class="pt-2 border-t border-gray-100">
              <div class="text-[10px] font-medium text-gray-500 uppercase mb-1">Réseau</div>
              <div class="text-xs space-y-0.5">
                <div class="flex justify-between">
                  <span class="text-gray-500">IP</span>
                  <span class="text-gray-600 font-mono text-[10px]">{{ deviceStatus?.system?.ip || '--' }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-500">MAC</span>
                  <span class="text-gray-600 font-mono text-[10px]">{{ deviceStatus?.system?.mac || '--' }}</span>
                </div>
              </div>
            </div>
            
            <!-- Memory Section -->
            <div class="pt-2 border-t border-gray-100">
              <div class="text-[10px] font-medium text-gray-500 uppercase mb-1">Mémoire</div>
              <div class="space-y-2">
                <!-- Flash Bar -->
                <MemoryBar
                  label="Flash"
                  :used-formatted="formatKb(flashPercentages.totalUsedKb)"
                  :total-formatted="formatKb(flashTotalKb)"
                  :segments="flashSegments"
                />
                <!-- RAM Bar -->
                <MemoryBar
                  label="RAM"
                  :used-formatted="formatKb(ramPercentages.usedKb)"
                  :total-formatted="formatKb(ramTotalKb)"
                  :percent="ramUsedPercent"
                  :tooltip="ramUsedTooltip"
                  show-percent
                />
              </div>
            </div>
          </div>
        </div>

        <!-- MIDDLE: Configuration du module (2 cols) -->
        <div class="col-span-6 lg:col-span-2 flex flex-col space-y-3">
          <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Configuration
          </h3>
          
          <!-- Zone Selector -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-100 p-3 flex-grow">
            <span class="text-[10px] font-medium text-gray-500 uppercase mb-1 block">Zone associée</span>
            <div class="flex flex-wrap gap-1.5 mt-2 items-center">
              <!-- Zone Tags (toggle on click) -->
              <button
                v-for="zone in zones"
                :key="zone.id"
                @click="handleToggleZone(zone.id)"
                class="px-2 py-0.5 text-xs rounded transition-colors"
                :class="zone.id === currentZoneId 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
              >
                {{ zone.name }}
              </button>
              <!-- Empty state -->
              <span v-if="zones.length === 0" class="text-xs text-gray-400 italic">
                Aucune zone
              </span>
            </div>
            <!-- Admin link -->
            <button
              @click="$emit('open-zone-drawer')"
              class="text-[10px] text-gray-400 hover:text-blue-500 underline transition-colors mt-2"
            >
              Administration des zones
            </button>
          </div>
        </div>

        <!-- RIGHT: Sensors (3 cols) -->
        <div class="col-span-6 lg:col-span-3 flex flex-col space-y-3">
          <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Configuration des Capteurs
          </h3>
          
          <div class="bg-white rounded-lg shadow-sm border border-gray-100 divide-y divide-gray-100 flex-grow">
            <HardwareSensorRow
              v-for="hw in hardwareSensorList"
              :key="hw.hardwareKey"
              :hardware="hw"
              :module-id="moduleId"
              :sensor-history-map="sensorHistoryMap"
            />
            
            <!-- Empty State --> 
            <div v-if="hardwareSensorList.length === 0" class="p-4 text-center text-xs text-gray-400">
              Aucun capteur détecté
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
/**
 * ModuleOptionsPanel
 * 
 * A collapsible panel that displays device information and sensor configuration.
 * Sensors are grouped by physical hardware (BMP280, DHT22, SPS30, etc.)
 */
import { computed } from 'vue'
import type { DeviceStatus, SensorDataPoint } from '../types'
import { getHardwareModel } from '../utils/hardware'
import { useStorageCalculations } from '../composables/useStorageCalculations'
import HardwareSensorRow from './HardwareSensorRow.vue'

// ============================================================================
// Props
// ============================================================================

interface Props {
  isOpen: boolean
  deviceStatus: DeviceStatus | null
  moduleId: string
  formattedUptime: string
  sensorHistoryMap?: Record<string, SensorDataPoint[]>
}

const props = withDefaults(defineProps<Props>(), {
  sensorHistoryMap: () => ({})
})

// ============================================================================
// Zone Selector (using useZones composable)
// ============================================================================

import { useZones } from '../composables/useZones'

const { zones, fetchZones, assignDevice, unassignDevice, getZoneIdByName } = useZones()

// Snackbar for feedback
import { useSnackbar } from '../composables/useSnackbar'
const { showSnackbar } = useSnackbar()

// Emit definition
const emit = defineEmits<{
  (e: 'zone-changed'): void
  (e: 'open-zone-drawer'): void
}>()

// Get current zone ID reactively by finding which zone contains this device
const currentZoneId = computed(() => {
  // Find which zone contains this moduleId
  for (const zone of zones.value) {
    if (zone.devices?.some(d => d.moduleId === props.moduleId)) {
      return zone.id
    }
  }
  // Fallback to looking up by zoneName from deviceStatus
  const zoneName = props.deviceStatus?.zoneName
  if (!zoneName) return null
  return getZoneIdByName(zoneName)
})

// Handle zone toggle for this device (click again to deselect)
const handleToggleZone = async (zoneId: string) => {
  const isCurrentlySelected = zoneId === currentZoneId.value
  const moduleName = props.deviceStatus?.preferences?.name || props.moduleId
  
  if (isCurrentlySelected) {
    // Deselect - unassign from zone
    const currentZone = zones.value.find(z => z.id === zoneId)
    await unassignDevice(props.moduleId)
    showSnackbar(`Le module ${moduleName} a été retiré de la zone "${currentZone?.name}"`, 'info')
  } else {
    // Select - assign to zone
    await assignDevice(zoneId, props.moduleId)
    const zone = zones.value.find(z => z.id === zoneId)
    showSnackbar(`Le module ${moduleName} a été assigné à la zone "${zone?.name}"`, 'success')
  }
  emit('zone-changed')
}

// Fetch zones when panel opens
watch(() => props.isOpen, (isOpen) => {
  if (isOpen && zones.value.length === 0) {
    fetchZones()
  }
}, { immediate: true })

// ============================================================================
// Computed: Device Info
// ============================================================================

const deviceStatusRef = computed(() => props.deviceStatus)
const { flashPercentages, ramPercentages } = useStorageCalculations(deviceStatusRef)

const hardwareModel = computed(() => 
  getHardwareModel(props.deviceStatus?.hardware?.chip)
)

const cpuFreq = computed(() => 
  props.deviceStatus?.hardware?.chip?.cpuFreqMhz || '--'
)

// Online status based on bootedAt being set
const isOnline = computed(() => 
  !!props.deviceStatus?.system?.bootedAt
)

const flashUsedPercent = computed(() => {
  const { sketchPercent, otaPercent, systemPercent } = flashPercentages.value
  return Math.round(sketchPercent + otaPercent + systemPercent)
})

// Flash segments for MemoryBar component
const flashSegments = computed(() => {
  const { sketchPercent, otaPercent, systemPercent } = flashPercentages.value
  return [
    {
      percent: sketchPercent,
      color: 'bg-gray-300',
      label: 'Sketch',
      labelMinPercent: 12,
      labelColor: 'text-gray-600',
      tooltip: sketchTooltip.value,
    },
    {
      percent: otaPercent,
      color: 'bg-gray-400',
      label: 'OTA',
      labelMinPercent: 8,
      labelColor: 'text-gray-100',
      tooltip: otaTooltip.value,
    },
    {
      percent: systemPercent,
      color: 'bg-gray-500',
      label: 'Sys',
      labelMinPercent: 6,
      labelColor: 'text-gray-100',
      tooltip: sysTooltip.value,
    },
  ]
})

const ramUsedPercent = computed(() => 
  Math.round(ramPercentages.value.usedPercent)
)

const flashTooltip = computed(() => {
  const { sketchPercent, otaPercent, systemPercent, freePercent } = flashPercentages.value
  return `Sketch: ${Math.round(sketchPercent)}% | OTA: ${Math.round(otaPercent)}% | Sys: ${Math.round(systemPercent)}% | Libre: ${Math.round(freePercent)}%`
})

const ramTooltip = computed(() => {
  const { usedPercent, freePercent } = ramPercentages.value
  return `Utilisé: ${Math.round(usedPercent)}% | Libre: ${Math.round(freePercent)}%`
})

// Storage size helpers
const flashTotalKb = computed(() => {
  return props.deviceStatus?.hardware?.chip?.flashKb || 0
})

const ramTotalKb = computed(() => {
  return props.deviceStatus?.system?.memory?.heapTotalKb || 0
})

// Individual segment tooltips
const sketchTooltip = computed(() => {
  const kb = props.deviceStatus?.system?.flash?.usedKb || 0
  const percent = flashPercentages.value.sketchPercent
  return `Sketch: ${formatKb(kb)} (${Math.round(percent)}%)`
})

const otaTooltip = computed(() => {
  const kb = props.deviceStatus?.system?.flash?.freeKb || 0
  const percent = flashPercentages.value.otaPercent
  return `OTA: ${formatKb(kb)} (${Math.round(percent)}%)`
})

const sysTooltip = computed(() => {
  const kb = props.deviceStatus?.system?.flash?.systemKb || 0
  const percent = flashPercentages.value.systemPercent
  return `System: ${formatKb(kb)} (${Math.round(percent)}%)`
})

const ramUsedTooltip = computed(() => {
  const kb = ramPercentages.value.usedKb
  const percent = ramPercentages.value.usedPercent
  return `Utilisé: ${formatKb(kb)} (${Math.round(percent)}%)`
})

const formatKb = (kb: number | undefined): string => {
  if (!kb || kb === 0) return '--'
  if (kb >= 1024) return `${(kb / 1024).toFixed(1)}MB`
  return `${Math.round(kb)}KB`
}

// ============================================================================
// Hardware Grouping Definition
// ============================================================================

/**
 * Mapping of physical hardware sensors to their measurement types.
 * Each hardware sensor reads multiple values simultaneously.
 */
const HARDWARE_SENSORS = [
  {
    hardwareKey: 'mhz14a',
    name: 'MH-Z14A',
    measurements: ['co2'],
    measurementLabels: { co2: 'CO2' }
  },
  {
    hardwareKey: 'dht22',
    name: 'DHT22',
    measurements: ['temperature', 'humidity'],
    measurementLabels: { temperature: 'Temp', humidity: 'Hum' }
  },
  {
    hardwareKey: 'bmp280',
    name: 'BMP280',
    measurements: ['pressure', 'temperature_bmp'],
    measurementLabels: { pressure: 'Pression', temperature_bmp: 'Temp' }
  },
  {
    hardwareKey: 'sgp40',
    name: 'SGP40',
    measurements: ['voc'],
    measurementLabels: { voc: 'COV' }
  },
  {
    hardwareKey: 'sgp30',
    name: 'SGP30',
    measurements: ['eco2', 'tvoc'],
    measurementLabels: { eco2: 'eCO2', tvoc: 'TCOV' }
  },
  {
    hardwareKey: 'sht30',
    name: 'SHT30',
    measurements: ['temp_sht', 'hum_sht'],
    measurementLabels: { temp_sht: 'Temp', hum_sht: 'Hum' }
  },
  {
    hardwareKey: 'sps30',
    name: 'SPS30',
    measurements: ['pm1', 'pm25', 'pm4', 'pm10'],
    measurementLabels: { pm1: 'PM1', pm25: 'PM2.5', pm4: 'PM4', pm10: 'PM10' }
  },
] as const

// ============================================================================
// Computed: Hardware Sensor List
// ============================================================================

export interface HardwareSensorItem {
  hardwareKey: string
  name: string
  measurements: Array<{
    key: string
    label: string
    status: 'ok' | 'missing' | 'unknown'
    value?: number
  }>
  interval: number
  status: 'ok' | 'partial' | 'missing'
}

const hardwareSensorList = computed<HardwareSensorItem[]>(() => {
  const sensors = props.deviceStatus?.sensors || {}
  const config = props.deviceStatus?.sensorsConfig?.sensors || {}
  
  const list: HardwareSensorItem[] = []
  
  for (const hw of HARDWARE_SENSORS) {
    // Check if any measurement from this hardware exists
    const measurements = hw.measurements.map(key => {
      const sensorStatus = sensors[key]
      const exists = sensorStatus !== undefined
      
      return {
        key,
        label: hw.measurementLabels[key as keyof typeof hw.measurementLabels],
        status: !exists ? 'unknown' as const
              : sensorStatus?.status === 'ok' ? 'ok' as const
              : sensorStatus?.status === 'missing' ? 'missing' as const
              : 'unknown' as const,
        value: sensorStatus?.value
      }
    }).filter(m => m.status !== 'unknown' || sensors[m.key] !== undefined)
    
    // Skip hardware with no detected measurements
    const activeMeasurements = measurements.filter(m => 
      sensors[m.key] !== undefined
    )
    if (activeMeasurements.length === 0) continue
    
    // Determine overall hardware status
    const okCount = activeMeasurements.filter(m => m.status === 'ok').length
    const hwStatus = okCount === activeMeasurements.length ? 'ok'
                   : okCount === 0 ? 'missing'
                   : 'partial'
    
    // Get interval from first measurement's config
    const firstKey = hw.measurements[0]
    const interval = config[firstKey]?.interval || 60
    
    list.push({
      hardwareKey: hw.hardwareKey,
      name: hw.name,
      measurements: activeMeasurements,
      interval,
      status: hwStatus as 'ok' | 'partial' | 'missing'
    })
  }
  
  return list
})
</script>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease-out;
  max-height: 500px;
}

.slide-enter-from,
.slide-leave-to {
  max-height: 0;
  opacity: 0;
  padding-top: 0;
  padding-bottom: 0;
}
</style>
