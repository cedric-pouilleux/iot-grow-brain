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
      <div class="flex items-center gap-2">
        
        <!-- Options Button -->
        <button
          class="h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-300 text-gray-500 dark:text-gray-400 border-t border-transparent hover:text-white hover:bg-gradient-to-b hover:from-gray-900 hover:to-gray-800 hover:border-blue-400/50 hover:shadow-[0_0_2px_rgba(0,0,0,0.9)]"
          :class="optionsPanelOpen ? 'bg-gradient-to-b from-gray-900 to-gray-800 border-blue-400/50 text-white shadow-[0_0_2px_rgba(0,0,0,0.9)]' : ''"
          title="Options du module"
          @click="$emit('toggle-options')"
        >
          <Icon 
            name="tabler:settings" 
            class="w-5 h-5 transition-transform duration-300"
            :class="{ 'rotate-90': optionsPanelOpen }"
          />
        </button>

        <!-- Logs Button -->
        <NuxtLink
          :to="`/logs?search=${moduleId}&category=HARDWARE`"
          class="h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-300 text-gray-500 dark:text-gray-400 border-t border-transparent hover:text-white hover:bg-gradient-to-b hover:from-gray-900 hover:to-gray-800 hover:border-blue-400/50 hover:shadow-[0_0_2px_rgba(0,0,0,0.9)]"
          title="Voir les logs du module"
        >
          <Icon name="tabler:notes" class="w-5 h-5" />
        </NuxtLink>



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
  optionsPanelOpen?: boolean
}>()

// ============================================================================
// Emits
// ============================================================================

const emit = defineEmits<{
  (e: 'toggle-options'): void
}>()

// ============================================================================
// Composables
// ============================================================================

import { useZones } from '../composables/useZones'
const { zones } = useZones()

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

</script>
