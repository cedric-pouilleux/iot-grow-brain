<template>
  <!--
    BenchModuleHeader.vue
    =====================
    Header for benchmark-module-sensor.
    Contains module type icon, options button, and logs link.
  -->
  <div class="py-2">
    <div class="flex flex-wrap items-center gap-4 mb-4">
      
      <!-- Left: Module Type (No Icon) -->
      <div 
        class="flex items-center gap-2 cursor-pointer group"
        @click="$emit('toggle-options')"
        title="Ouvrir les options"
      >
        <h2
          class="font-black text-3xl tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-gray-900 via-gray-600 to-gray-800 dark:from-white dark:via-gray-200 dark:to-gray-500 filter drop-shadow-sm leading-none"
          style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;"
        >
          {{ moduleTypeLabel }}
        </h2>
      </div>

      <!-- Right: Controls -->
      <div class="flex items-center gap-2">
        
        <!-- Options Button -->
        <UIButton 
          icon="tabler:settings"
          :icon-class="{ 'rotate-90': optionsPanelOpen }"
          :variant="optionsPanelOpen ? 'blue' : 'ghost'"
          size="small"
          :clickable="true"
          label="Options"
          title="Options du module"
          @click="$emit('toggle-options')"
        /> 

        <!-- Logs Button -->
        <NuxtLink :to="`/logs?search=${moduleId}&category=HARDWARE`" target="_blank" title="Voir les logs du module">
          <UIButton 
            icon="tabler:notes"
            variant="ghost"
            size="small"
            label="Logs"
            :clickable="true"
          />
        </NuxtLink>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * BenchModuleHeader
 * 
 * Header component for benchmark sensor module.
 * Options toggle and logs link.
 */
import { computed } from 'vue'
import type { DeviceStatus } from '../../common/types'
import { getWifiClass } from '../../common/utils/hardware'
import UIButton from '~/components/design-system/UIButton/UIButton.vue'

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

import { useZones } from '~/composables/useZones'
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
  'air-quality-bench': 'Qualité de l\'air (Benchmark)',
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
