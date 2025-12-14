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
      <div class="grid grid-cols-6 gap-4 mb-4">
        
        <!-- LEFT: Informations (1 col) -->
        <div class="col-span-6 lg:col-span-1 space-y-3">
          <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Informations
          </h3>
          
          <div class="bg-white rounded-lg shadow-sm border border-gray-100 p-3 space-y-3">
            <!-- Header: Module Name + Uptime -->
            <div>
              <div class="text-sm font-semibold text-gray-800 capitalize">{{ moduleId }}</div>
              <div class="text-[10px] text-gray-400">uptime : {{ formattedUptime }}</div>
            </div>
            
            <!-- Model + CPU -->
            <div class="text-xs space-y-0.5">
              <div class="text-gray-700 font-medium">{{ hardwareModel }}</div>
              <div class="text-gray-500">CPU : {{ cpuFreq }} MHz</div>
            </div>
            
            <!-- Network Section -->
            <div class="pt-2 border-t border-gray-100">
              <div class="text-[10px] font-medium text-gray-500 uppercase mb-1">Réseau</div>
              <div class="text-xs space-y-0.5">
                <div class="flex justify-between">
                  <span class="text-gray-400">IP</span>
                  <span class="text-gray-700 font-mono text-[10px]">{{ deviceStatus?.system?.ip || '--' }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-400">MAC</span>
                  <span class="text-gray-700 font-mono text-[10px]">{{ deviceStatus?.system?.mac || '--' }}</span>
                </div>
              </div>
            </div>
            
            <!-- Memory Section -->
            <div class="pt-2 border-t border-gray-100">
              <div class="text-[10px] font-medium text-gray-500 uppercase mb-1">Mémoire</div>
              <div class="space-y-2">
                <!-- Flash Bar -->
                <div class="text-xs">
                  <div class="flex justify-between mb-0.5">
                    <span class="text-gray-400">Flash</span>
                    <span class="text-gray-500 text-[9px]">{{ formatKb(flashPercentages.totalUsedKb) }} / {{ formatKb(flashTotalKb) }}</span>
                  </div>
                  <div class="h-5 bg-gray-100 rounded-sm overflow-hidden flex">
                    <div 
                      v-if="flashPercentages.sketchPercent > 0"
                      class="bg-gray-300 h-full flex items-center justify-center cursor-help" 
                      :style="{ width: flashPercentages.sketchPercent + '%' }"
                      :title="sketchTooltip"
                    >
                      <span v-if="flashPercentages.sketchPercent > 12" class="text-[9px] font-medium text-gray-600">Sketch</span>
                    </div>
                    <div 
                      v-if="flashPercentages.otaPercent > 0"
                      class="bg-gray-400 h-full flex items-center justify-center cursor-help" 
                      :style="{ width: flashPercentages.otaPercent + '%' }"
                      :title="otaTooltip"
                    >
                      <span v-if="flashPercentages.otaPercent > 8" class="text-[9px] font-medium text-gray-100">OTA</span>
                    </div>
                    <div 
                      v-if="flashPercentages.systemPercent > 0"
                      class="bg-gray-500 h-full flex items-center justify-center cursor-help" 
                      :style="{ width: flashPercentages.systemPercent + '%' }"
                      :title="sysTooltip"
                    >
                      <span v-if="flashPercentages.systemPercent > 6" class="text-[9px] font-medium text-gray-100">Sys</span>
                    </div>
                  </div>
                </div>
                <!-- RAM Bar -->
                <div class="text-xs">
                  <div class="flex justify-between mb-0.5">
                    <span class="text-gray-400">RAM</span>
                    <span class="text-gray-500 text-[9px]">{{ formatKb(ramPercentages.usedKb) }} / {{ formatKb(ramTotalKb) }}</span>
                  </div>
                  <div class="h-5 bg-gray-100 rounded-sm overflow-hidden cursor-help" :title="ramUsedTooltip">
                    <div 
                      class="bg-gray-400 h-full flex items-center justify-center" 
                      :style="{ width: ramUsedPercent + '%' }"
                    >
                      <span v-if="ramUsedPercent > 12" class="text-[9px] font-medium text-gray-100">{{ Math.round(ramUsedPercent) }}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- MIDDLE: Configuration du module (2 cols) -->
        <div class="col-span-6 lg:col-span-2 space-y-3">
          <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Configuration
          </h3>
          
          <!-- Zone Selector -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-100 p-3 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-gray-600">Zone</span>
              <button
                @click="$emit('open-zone-drawer')"
                class="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                title="Gérer les zones"
              >
                <Icon name="tabler:settings" class="w-3.5 h-3.5" />
              </button>
            </div>
            <div class="flex flex-wrap gap-1.5">
              <!-- Zone Tags (toggle on click) -->
              <button
                v-for="zone in zones"
                :key="zone.id"
                @click="handleToggleZone(zone.id)"
                class="px-2 py-0.5 text-xs rounded-full transition-colors"
                :class="zone.id === currentZoneId 
                  ? 'bg-gray-800 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
              >
                {{ zone.name }}
              </button>
              <!-- Empty state -->
              <span v-if="zones.length === 0" class="text-xs text-gray-400 italic">
                Aucune zone
              </span>
            </div>
          </div>
        </div>

        <!-- RIGHT: Sensors (3 cols) -->
        <div class="col-span-6 lg:col-span-3 space-y-3">
          <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Configuration des Capteurs
          </h3>
          
          <div class="bg-white rounded-lg shadow-sm border border-gray-100 divide-y divide-gray-100">
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

const flashUsedPercent = computed(() => {
  const { sketchPercent, otaPercent, systemPercent } = flashPercentages.value
  return Math.round(sketchPercent + otaPercent + systemPercent)
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
