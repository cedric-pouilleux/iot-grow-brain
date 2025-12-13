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
  <div class="py-2 border-b border-gray-100">
    <div class="flex flex-wrap justify-between items-center gap-3">
      
      <!-- Left: Module Name -->
      <div class="flex items-center gap-2">
        <div class="flex items-center justify-center text-emerald-600">
          <Icon name="tabler:cloud-computing" class="w-4 h-4" />
        </div>
        <h2
          class="font-normal text-lg text-gray-500 leading-none"
          style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;"
        >
          {{ capitalizedModuleName }}
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

        <!-- Graph Duration Selector -->
        <AppDropdown
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

        <!-- WiFi Signal Indicator -->
        <div class="relative group/rssi cursor-help flex items-center justify-center">
          <Icon v-if="!rssi" name="tabler:wifi-off" class="w-6 h-6" :class="rssiClass" />
          <Icon v-else-if="rssi > -60" name="tabler:wifi" class="w-6 h-6" :class="rssiClass" />
          <Icon v-else-if="rssi > -75" name="tabler:wifi-2" class="w-6 h-6" :class="rssiClass" />
          <Icon v-else-if="rssi > -85" name="tabler:wifi-1" class="w-6 h-6" :class="rssiClass" />
          <Icon v-else name="tabler:wifi-0" class="w-6 h-6" :class="rssiClass" />
          <div
            class="absolute top-full right-0 mt-1 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover/rssi:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg"
          >
            Signal: {{ rssi || '--' }} dBm
          </div>
        </div>
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
// Computed
// ============================================================================

const capitalizedModuleName = computed(() => {
  if (!props.moduleName) return ''
  return props.moduleName.charAt(0).toUpperCase() + props.moduleName.slice(1)
})

const rssiClass = computed(() => getWifiClass(props.rssi))

// ============================================================================
// Methods
// ============================================================================

const selectDuration = (duration: string, closeFn: () => void) => {
  emit('update:graphDuration', duration)
  closeFn()
}
</script>
