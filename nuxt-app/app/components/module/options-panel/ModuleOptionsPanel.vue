<template>
  <!-- 
    ModuleOptionsPanel.vue
    =====================
    Collapsible panel for module configuration.
    Uses sub-components for device info, chart options, and sensor config.
  -->
  <Transition name="slide">
    <div 
      v-if="isOpen" 
      class="overflow-visible mb-5"
    >
      <div class="grid grid-cols-6 gap-4 mb-5 items-stretch">
        
        <!-- LEFT: Device Info (1 col) -->
        <DeviceInfoSection
          :deviceStatus="deviceStatus"
          :moduleId="moduleId"
        />

        <!-- MIDDLE: Module Configuration (2 cols) -->
        <div class="col-span-6 lg:col-span-2 flex flex-col space-y-3">
          <h3 class="text-[13px] text-gray-500 dark:text-white">
            Configuration du module
          </h3>
          
          <!-- Zone Selector -->
          <div class="bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm p-3 flex-grow">
            <h3 class="text-[12px] text-gray-500 dark:text-gray-200 mb-1 block">Zone associée</h3>
            <div class="flex flex-wrap gap-1.5 mt-2 items-center">
              <button
                v-for="zone in zones"
                :key="zone.id"
                @click="handleToggleZone(zone.id)"
              >
                <UIButton 
                  :label="zone.name" 
                  size="large"
                  :variant="zone.id === currentZoneId ? 'blue' : 'gray'"
                  clickable
                />
              </button>
              <span v-if="zones.length === 0" class="text-xs text-gray-400 italic">
                Aucune zone
              </span>
            </div>
            <button
              @click="$emit('open-zone-drawer')"
              class="text-[10px] text-gray-400 hover:text-blue-500 underline transition-colors mt-2"
            >
              Administration des zones
            </button>
          </div>

          <!-- Chart Options -->
          <ChartOptionsSection />
        </div>

        <!-- RIGHT: Sensors Configuration (3 cols) -->
        <SensorConfigSection
          :deviceStatus="deviceStatus"
          :moduleId="moduleId"
          :sensorHistoryMap="sensorHistoryMap"
        />
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
/**
 * ModuleOptionsPanel
 * 
 * Main panel component using sub-components for cleaner organization:
 * - DeviceInfoSection: Hardware, network, memory display
 * - ChartOptionsSection: Chart visibility toggles
 * - SensorConfigSection: Hardware sensor list
 */
import { computed } from 'vue'
import type { DeviceStatus, SensorDataPoint } from '../../../types'
import { useZones } from '../../../composables/useZones'
import UIButton from '../../design-system/UIButton/UIButton.vue'
import DeviceInfoSection from './DeviceInfoSection.vue'
import ChartOptionsSection from './ChartOptionsSection.vue'
import SensorConfigSection from './SensorConfigSection.vue'

// Use zones composable
const { zones } = useZones()

interface Props {
  isOpen: boolean
  moduleId: string
  deviceStatus: DeviceStatus | null
  sensorHistoryMap?: Record<string, SensorDataPoint[]>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'toggle-zone': [zoneId: string]
  'open-zone-drawer': []
  'zone-changed': []
}>()

// Current zone from device status
const currentZoneId = computed(() => {
  // Find zone that contains this module
  for (const zone of zones.value) {
    if (zone.devices?.some(d => d.moduleId === props.moduleId)) {
      return zone.id
    }
  }
  return undefined
})

const handleToggleZone = async (zoneId: string) => {
  // Toggle zone assignment
  try {
    if (currentZoneId.value === zoneId) {
      // Unassign
      await $fetch(`/api/zones/${zoneId}/devices/${encodeURIComponent(props.moduleId)}`, {
        method: 'DELETE'
      })
    } else {
      // If already in another zone, remove first
      if (currentZoneId.value) {
        await $fetch(`/api/zones/${currentZoneId.value}/devices/${encodeURIComponent(props.moduleId)}`, {
          method: 'DELETE'
        })
      }
      // Assign to new zone
      await $fetch(`/api/zones/${zoneId}/devices`, {
        method: 'POST',
        body: { deviceId: props.moduleId }
      })
    }
    emit('zone-changed')
  } catch (e) {
    console.error('Failed to toggle zone:', e)
  }
}
</script>

<style scoped>
/* Slide transition */
.slide-enter-active {
  transition: all 0.3s ease-out;
}

.slide-leave-active {
  transition: all 0.2s ease-in;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
