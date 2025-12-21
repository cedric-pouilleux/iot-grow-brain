<template>
  <UIPanel title="Configuration du module">
    <div class="flex items-center justify-between">
      <h3 class="text-[12px] font-medium text-gray-500 dark:text-gray-200">Zone associée</h3>
      
      <div class="flex items-center gap-2">
        <UISelect
          :model-value="currentZoneId"
          :options="zoneOptions"
          placeholder="Aucune zone"
          size="middle"
          class="w-40"
          @update:model-value="handleZoneSelect"
        />
        
        <UIButton
          icon="tabler:settings"
          variant="ghost"
          size="small"
          title="Administration des zones"
          clickable
          @click="$emit('open-zone-drawer')"
        />
      </div>
    </div>
  </UIPanel>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useZones } from '~/features/zones/composables/useZones'
import UIButton from '~/components/design-system/UIButton/UIButton.vue'
import UISelect from '~/components/design-system/UISelect/UISelect.vue'
import UIPanel from '~/components/design-system/UIPanel/UIPanel.vue'

const props = defineProps<{
  moduleId: string
}>()

const emit = defineEmits<{
  'open-zone-drawer': []
  'zone-changed': []
}>()

// Use zones composable
const { zones, assignDevice, unassignDevice } = useZones()

// Current zone logic
const currentZoneId = computed(() => {
  for (const zone of zones.value) {
    if (zone.devices?.some(d => d.moduleId === props.moduleId)) {
      return zone.id
    }
  }
  return undefined
})

const zoneOptions = computed(() => {
  return zones.value.map(z => ({
    label: z.name,
    value: z.id
  }))
})

const handleZoneSelect = async (zoneId: string | number) => {
  if (!zoneId) return

  try {
    const id = String(zoneId)
    
    if (currentZoneId.value === id) {
      return
    }
    
    if (currentZoneId.value) {
      await unassignDevice(props.moduleId)
    }
    
    await assignDevice(id, props.moduleId)
    emit('zone-changed')
  } catch (e) {
    console.error('Failed to change zone:', e)
  }
}
</script>
