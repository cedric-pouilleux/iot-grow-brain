<template>
  <!-- 
    SensorsModuleOptions.vue
    ========================
    Collapsible options panel for sensor-based modules.
    Reusable across all modules that have sensors.
  -->
  <div 
    class="options-wrapper"
    :class="{ 'is-open': isOpen }"
  >
    <div class="options-content">
      <div class="grid grid-cols-6 gap-4 mb-5 items-stretch">
        <DeviceInfoSection
          :deviceStatus="deviceStatus"
          :moduleId="moduleId"
        />
        <ModuleConfigurationSection
          :moduleId="moduleId"
          @open-zone-drawer="$emit('open-zone-drawer')"
          @zone-changed="$emit('zone-changed')"
        />
        <SensorConfigSection
          :deviceStatus="deviceStatus"
          :moduleId="moduleId"
          :sensorHistoryMap="sensorHistoryMap"
          :dbSize="dbSize"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import type { DeviceStatus, SensorDataPoint } from '../types'
import DeviceInfoSection from './DeviceInfoSection.vue'
import ModuleConfigurationSection from './ModuleConfigurationSection.vue'
import SensorConfigSection from './SensorConfigSection.vue'
import { useDatabase } from '~/features/modules/common/composables/useDatabase'

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

const { dbSize, loadDbSize } = useDatabase()

// Load DB size when opened
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    loadDbSize()
  }
})
</script>

<style scoped>
/* CSS Grid animation for smooth height transition */
.options-wrapper {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.options-wrapper.is-open {
  grid-template-rows: 1fr;
}

.options-content {
  min-height: 0;
  opacity: 0;
  /* Fast opacity fade-out on close (no delay) */
  transition: opacity 0.1s ease-out;
}

.options-wrapper.is-open .options-content {
  opacity: 1;
  padding-bottom: 1.25rem;
  /* Slower fade-in with delay on open */
  transition: opacity 0.3s ease-out 0.15s;
}
</style>
