<template>
  <!-- 
    SensorsModuleOptions.vue
    ========================
    Collapsible options panel for sensor-based modules.
    Reusable across all modules that have sensors.
  -->
  <Transition name="slide">
    <div 
      v-if="isOpen" 
      class="overflow-visible mb-5"
    >
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
  </Transition>
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
