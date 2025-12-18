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
      class="overflow-visible mb-5"
    >
      <div class="grid grid-cols-6 gap-4 mb-5 items-stretch">
        
        <!-- LEFT: Informations (1 col) -->
        <div class="col-span-6 lg:col-span-1 flex flex-col justify-between space-y-3">
          
          <!-- Hardware Section -->
          <div>
            <h3 class="text-[13px] text-gray-500 dark:text-white">Hardware</h3>
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm mt-3 p-3">
              <div class="flex items-center justify-between mb-1"> 
                <span class="text-[12px] font-medium text-gray-500 dark:text-gray-200">{{ hardwareModel }}</span>
                <div 
                  class="w-2.5 h-2.5 rounded-full cursor-help"
                  :class="isOnline ? 'bg-green-500' : 'bg-red-500'"
                  :title="'Uptime: ' + formattedUptime"
                ></div> 
              </div>
              <div class="text-xs space-y-0.5 text-gray-500 dark:text-gray-400">
                <div>{{ moduleId }}</div>
                <div>Cpu {{ cpuFreq }} MHz</div>
              </div>
            </div>
          </div>

          <!-- Network Section -->
          <div>
            <h3 class="text-[13px] text-gray-500 dark:text-white">Réseau</h3>
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm mt-3 p-3">
              <div class="flex items-center justify-between mb-1">
                <span class="text-[12px] font-medium text-gray-500 dark:text-gray-200">Wi-Fi</span>
                <div class="cursor-help" :title="`Signal: ${rssi || '--'} dBm`">
                  <Icon v-if="!rssi" name="tabler:wifi-off" class="w-5 h-5" :class="rssiClass" />
                  <Icon v-else-if="rssi > -60" name="tabler:wifi" class="w-5 h-5" :class="rssiClass" />
                  <Icon v-else-if="rssi > -75" name="tabler:wifi-2" class="w-5 h-5" :class="rssiClass" />
                  <Icon v-else-if="rssi > -85" name="tabler:wifi-1" class="w-5 h-5" :class="rssiClass" />
                  <Icon v-else name="tabler:wifi-0" class="w-5 h-5" :class="rssiClass" />
                </div>
              </div>
              <div class="text-xs space-y-0.5">
                <div class="flex justify-between">
                  <span class="text-gray-500 dark:text-gray-400">IP</span>
                  <span class="text-gray-600 dark:text-gray-300 font-mono text-[10px]">{{ deviceStatus?.system?.ip || '--' }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-500 dark:text-gray-400">MAC</span>
                  <span class="text-gray-600 dark:text-gray-300 font-mono text-[10px]">{{ deviceStatus?.system?.mac || '--' }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Memory Section -->
          <div>
            <h3 class="text-[13px] text-gray-500 dark:text-white">Mémoire</h3>
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm mt-3 p-3">
              <div class="flex gap-4 justify-center">
                <!-- Flash Doughnut -->
                <div class="w-16 h-16 relative">
                  <ClientOnly>
                    <Doughnut :data="flashChartData" :options="doughnutOptions" />
                  </ClientOnly>
                  <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span class="text-[9px] font-medium text-gray-500 dark:text-gray-400">Flash</span>
                  </div>
                </div>
                <!-- RAM Doughnut -->
                <div class="w-16 h-16 relative">
                  <ClientOnly>
                    <Doughnut :data="ramChartData" :options="doughnutOptions" />
                  </ClientOnly>
                  <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span class="text-[9px] font-medium text-gray-500 dark:text-gray-400">RAM</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- MIDDLE: Configuration du module (2 cols) -->
        <div class="col-span-6 lg:col-span-2 flex flex-col space-y-3">
          <h3 class="text-[13px] text-gray-500 dark:text-white">
            Configuration du module
          </h3>
          
          <!-- Zone Selector -->
          <div class="bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm p-3 flex-grow">
            <h3 class="text-[12px] text-gray-500 dark:text-gray-200 mb-1 block">Zone associée</h3>
            <div class="flex flex-wrap gap-1.5 mt-2 items-center">
              <!-- Zone Tags (toggle on click) -->
              <button
                v-for="zone in zones"
                :key="zone.id"
                @click="handleToggleZone(zone.id)"
              >
                <UITag 
                  :label="zone.name" 
                  size="large"
                  :variant="zone.id === currentZoneId ? 'blue' : 'gray'"
                  clickable
                />
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

          <!-- Chart Options -->
          <h3 class="text-[13px] text-gray-500 dark:text-white">Configuration des cartes</h3>
          <div class="bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm p-3">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs text-gray-600 dark:text-gray-300">Afficher les seuils d'alerte</span>
              <UIToggle v-model="colorThresholds" />
            </div>
            <!-- Show Charts Toggle (Parent option) -->
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-600 dark:text-gray-300">Afficher les graphiques</span>
              <UIToggle v-model="showCharts" />
            </div>
            
            <!-- Dependent options container (indented with border-left) -->
            <div v-if="showCharts" class="mt-2 ml-2 pl-2 border-l-2 border-gray-200 dark:border-gray-600 space-y-2">
              <!-- Threshold Lines Toggle -->
              <div class="flex items-center justify-between">
                <span class="text-xs text-gray-500 dark:text-gray-400">Afficher les seuils</span>
                <UIToggle v-model="showThresholdLines" />
              </div>
              
              <!-- Color Thresholds Toggle -->
              <div class="flex items-center justify-between">
                <span class="text-xs text-gray-500 dark:text-gray-400">Couleurs de seuil</span>
                <UIToggle v-model="colorThresholds" />
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT: Sensors (3 cols) -->
        <div class="col-span-6 lg:col-span-3 flex flex-col space-y-3">

          <h3 class="text-[13px] text-gray-500 dark:text-white">Configuration des Capteurs</h3>
          
          <div class="bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm divide-y divide-gray-100 dark:divide-gray-900 flex-grow">
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
import UIToggle from './ui/UIToggle.vue'
import UITag from './ui/UITag.vue'
import { Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js'

// Register Chart.js components
if (process.client) {
  ChartJS.register(ArcElement, Tooltip)
}

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

// Chart settings
import { useChartSettings } from '../composables/useChartSettings'
const { showCharts, showThresholdLines, colorThresholds, toggleShowCharts, toggleThresholdLines, toggleColorThresholds } = useChartSettings()

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

// WiFi RSSI signal strength
const rssi = computed(() => props.deviceStatus?.system?.rssi)

// WiFi signal color class based on strength
const rssiClass = computed(() => {
  const r = rssi.value
  if (!r) return 'text-gray-400'
  if (r > -60) return 'text-green-500'
  if (r > -75) return 'text-yellow-500'
  if (r > -85) return 'text-orange-500'
  return 'text-red-500'
})

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

// Doughnut chart data for Flash (3 segments: Sketch, OTA, System)
const flashChartData = computed(() => {
  const { sketchPercent, otaPercent, systemPercent, freePercent } = flashPercentages.value
  return {
    labels: ['Sketch', 'OTA', 'System', 'Libre'],
    datasets: [{
      data: [sketchPercent, otaPercent, systemPercent, freePercent],
      backgroundColor: ['#9ca3af', '#6b7280', '#4b5563', '#e5e7eb'],
      borderWidth: 0,
      cutout: '70%',
    }]
  }
})

// Doughnut chart data for RAM  
const ramChartData = computed(() => ({
  labels: ['Utilisé', 'Libre'],
  datasets: [{
    data: [ramUsedPercent.value, 100 - ramUsedPercent.value],
    backgroundColor: ['#3b82f6', '#e5e7eb'],
    borderWidth: 0,
    cutout: '70%',
  }]
}))

// External tooltip handler for doughnut charts
const getOrCreateTooltip = () => {
  let tooltipEl = document.getElementById('chartjs-tooltip')
  if (!tooltipEl) {
    tooltipEl = document.createElement('div')
    tooltipEl.id = 'chartjs-tooltip'
    tooltipEl.style.cssText = 'position:fixed;pointer-events:none;background:rgba(0,0,0,0.8);color:#fff;padding:4px 8px;border-radius:4px;font-size:11px;z-index:9999;transition:opacity 0.1s;white-space:nowrap;'
    document.body.appendChild(tooltipEl)
  }
  return tooltipEl
}

const externalTooltipHandler = (context: any) => {
  const { chart, tooltip } = context
  const tooltipEl = getOrCreateTooltip()
  
  if (tooltip.opacity === 0) {
    tooltipEl.style.opacity = '0'
    return
  }
  
  if (tooltip.body) {
    const label = tooltip.dataPoints[0]?.label || ''
    const value = tooltip.dataPoints[0]?.raw || 0
    tooltipEl.textContent = `${label}: ${Math.round(value)}%`
  }
  
  const { left, top } = chart.canvas.getBoundingClientRect()
  tooltipEl.style.opacity = '1'
  tooltipEl.style.left = left + tooltip.caretX + 'px'
  tooltipEl.style.top = top + tooltip.caretY - 30 + 'px'
}

// Doughnut chart options with external tooltip
const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: { display: false },
    tooltip: { 
      enabled: false,
      external: externalTooltipHandler
    }
  }
}

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
    hardwareKey: 'sc16co',
    name: 'SC16-CO',
    measurements: ['co'],
    measurementLabels: { co: 'CO' }
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
    name: 'SHT31',
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
  status: 'ok' | 'missing'
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
    
    // Determine overall hardware status: ok if ALL measurements are ok, otherwise missing
    const allOk = activeMeasurements.every(m => m.status === 'ok')
    const hwStatus = allOk ? 'ok' : 'missing'
    
    // Get interval from first measurement's config
    const firstKey = hw.measurements[0]
    const interval = config[firstKey]?.interval || 60
    
    list.push({
      hardwareKey: hw.hardwareKey,
      name: hw.name,
      measurements: activeMeasurements,
      interval,
      status: hwStatus as 'ok' | 'missing'
    })
  }
  
  return list
})
</script>

<style scoped>
/* Panel slide transition - smooth, no delay */
.slide-enter-active {
  transition: max-height 0.25s ease-out, opacity 0.2s ease-out;
  max-height: 500px;
}

.slide-leave-active {
  transition: max-height 0.2s ease-in, opacity 0.15s ease-in;
  max-height: 500px;
}

.slide-enter-from,
.slide-leave-to {
  max-height: 0;
  opacity: 0;
}

/* Shadow separator - upward shadow from center */
.shadow-separator {
  background: radial-gradient(ellipse 70% 100% at center bottom, rgba(0, 0, 0, 0.08) 0%, transparent 100%);
}

:global(.dark) .shadow-separator {
  background: radial-gradient(ellipse 70% 100% at center bottom, rgba(0, 0, 0, 0.9) 0%, transparent 100%);
}
</style>
