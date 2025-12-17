<template>
  <!--
    ModuleHeader.vue
    ================
    Header bar for a module panel. Contains:
    - Module name with icon
    - Options button (opens ModuleOptionsPanel)
    - Graph duration selector
    - WiFi signal indicator
  -->
  <div class="py-2">
    <div class="flex flex-wrap justify-between items-center gap-3">
      
      <!-- Left: Module Type with Icon -->
      <div 
        class="flex items-center gap-2 cursor-pointer group"
        @click="$emit('toggle-options')"
        title="Ouvrir les options"
      >
        <!-- Module Type Icon -->
        <Icon 
          v-if="moduleTypeIcon"
          :name="moduleTypeIcon" 
          class="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors"
        />
        <h2
          class="font-medium text-base text-gray-800 dark:text-gray-100 leading-tight"
          style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;"
        >
          {{ moduleTypeLabel }}
        </h2>
      </div>

      <!-- Right: Controls -->
      <div class="flex items-center gap-1">
        
        <!-- Options Button -->
        <button
          class="p-1.5 rounded-lg transition-colors flex items-center justify-center"
          :class="optionsPanelOpen ? 'bg-gray-900 text-white' : 'hover:bg-gray-100 text-gray-600 hover:text-gray-800'"
          title="Options du module"
          @click="$emit('toggle-options')"
        >
          <Icon 
            name="tabler:settings" 
            class="w-4 h-4 transition-transform duration-300"
            :class="{ 'rotate-90': optionsPanelOpen }"
          />
        </button>

        <!-- Logs Button -->
        <NuxtLink
          :to="`/logs?search=${moduleId}&category=HARDWARE`"
          class="p-1.5 rounded-lg transition-colors flex items-center justify-center hover:bg-gray-100 text-gray-600 hover:text-gray-800 dark:hover:bg-gray-700 dark:text-gray-300 dark:hover:text-white"
          title="Voir les logs du module"
        >
          <Icon name="tabler:notes" class="w-4 h-4" />
        </NuxtLink>

        <!-- Graph Duration Selector (only visible when charts enabled) -->
        <AppDropdown
          v-if="showCharts"
          id="graph-duration"
          position="relative"
          dropdown-class="top-full right-0 w-32 bg-gray-800 rounded-b-lg rounded-tl-lg shadow-xl z-50 overflow-hidden"
        >
          <template #trigger="{ isOpen, toggle }">
             <button
               class="p-1.5 rounded-t-lg transition-colors flex items-center justify-center gap-1"
               :class="isOpen ? 'bg-gray-900 group' : 'hover:bg-white'"
               title="Durée des graphiques"
               @click.stop="toggle"
             >
               <Icon
                 name="tabler:chart-dots"
                 class="w-4 h-4 transition-colors"
                 :class="isOpen ? 'text-white' : 'text-gray-600 group-hover:text-gray-800'"
               />
               <span class="text-[10px] font-medium" :class="isOpen ? 'text-white' : 'text-gray-500 group-hover:text-gray-800'">
                 {{ graphDuration }}
               </span>
             </button>
          </template>
          <template #content="{ close }">
            <div class="p-1 space-y-0.5">
               <button
                 v-for="duration in ['1h', '6h', '12h', '24h', '7j']"
                 :key="duration"
                 @click="selectDuration(duration, close)"
                 class="w-full text-left px-2 py-1.5 rounded text-xs transition-colors flex items-center justify-between"
                 :class="graphDuration === duration ? 'bg-gray-700 text-white font-medium' : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'"
               >
                 <span>{{ duration }}</span>
                 <Icon v-if="graphDuration === duration" name="tabler:check" class="w-3 h-3 text-emerald-400" />
               </button>
            </div>
          </template>
        </AppDropdown>

        <!-- Dark Mode Toggle -->
        <button
          class="p-1.5 rounded-lg transition-colors flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
          title="Basculer le thème"
          @click="toggleColorMode"
        >
          <Icon 
            :name="$colorMode.value === 'dark' ? 'tabler:sun' : 'tabler:moon'" 
            class="w-4 h-4"
          />
        </button>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * ModuleHeader
 * 
 * Simplified header with:
 * - Options toggle (gear icon)
 * - Graph duration selector
 * - WiFi signal indicator
 * 
 * Hardware/Network/Storage info moved to ModuleOptionsPanel.
 */
import { computed } from 'vue'
import type { DeviceStatus } from '../types'
import { getWifiClass } from '../utils/hardware'

import AppDropdown from './AppDropdown.vue'

// ============================================================================
// Props
// ============================================================================

const props = defineProps<{
  moduleName: string
  moduleId: string
  zoneName?: string | null
  rssi: number | null | undefined
  deviceStatus: DeviceStatus | null
  formattedUptime: string
  graphDuration?: string
  optionsPanelOpen?: boolean
}>()

// ============================================================================
// Emits
// ============================================================================

const emit = defineEmits<{
  (e: 'update:graphDuration', value: string): void
  (e: 'toggle-options'): void
}>()

// ============================================================================
// Composables
// ============================================================================

import { useZones } from '../composables/useZones'
const { zones } = useZones()

import { useChartSettings } from '../composables/useChartSettings'
const { showCharts } = useChartSettings()

// ============================================================================
// Computed
// ============================================================================

const capitalizedModuleName = computed(() => {
  if (!props.moduleName) return ''
  return props.moduleName.charAt(0).toUpperCase() + props.moduleName.slice(1)
})

// Reactive zone name - looks up from zones composable if device is assigned
const currentZoneName = computed(() => {
  // Find which zone contains this moduleId
  for (const zone of zones.value) {
    if (zone.devices?.some(d => d.moduleId === props.moduleId)) {
      return zone.name
    }
  }
  // Fallback to prop (from deviceStatus) if zones not loaded yet
  return props.zoneName || null
})

// Display title: zone name if has zone, otherwise module name
const displayTitle = computed(() => {
  return currentZoneName.value || capitalizedModuleName.value
})

// Module type icon mapping
const MODULE_TYPE_ICONS: Record<string, string> = {
  'air-quality': 'tabler:wind',
  'air-quality-bench': 'tabler:microscope',
  'lighting': 'tabler:bulb',
  'climate': 'tabler:temperature',
}

// Module type labels mapping (human-readable)
const MODULE_TYPE_LABELS: Record<string, string> = {
  'air-quality': 'Qualité d\'air',
  'air-quality-bench': 'Bench Qualité d\'air',
  'lighting': 'Éclairage',
  'climate': 'Climat',
}

const moduleTypeIcon = computed(() => {
  const type = props.deviceStatus?.moduleType
  if (!type) return 'tabler:device-unknown'
  return MODULE_TYPE_ICONS[type] || 'tabler:device-unknown'
})

const moduleTypeLabel = computed(() => {
  const type = props.deviceStatus?.moduleType
  if (!type) return 'Module inconnu'
  return MODULE_TYPE_LABELS[type] || type
})

const rssiClass = computed(() => getWifiClass(props.rssi))

// ============================================================================
// Color Mode
// ============================================================================

const colorMode = useColorMode()

const toggleColorMode = () => {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}

// ============================================================================
// Methods
// ============================================================================

const selectDuration = (duration: string, closeFn: () => void) => {
  emit('update:graphDuration', duration)
  closeFn()
}
</script>
