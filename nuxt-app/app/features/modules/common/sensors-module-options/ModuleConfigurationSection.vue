<template>
  <div class="col-span-6 md:col-span-3 lg:col-span-2 flex flex-col gap-3 justify-between">
    <ModuleZoneSection 
      :moduleId="moduleId"
      @open-zone-drawer="$emit('open-zone-drawer')"
      @zone-changed="$emit('zone-changed')"
    />
    <ChartOptionsSection />
  </div>
</template>

<script setup lang="ts">
import ModuleZoneSection from './ModuleZoneSection.vue'
import ChartOptionsSection from './ChartOptionsSection.vue'

defineProps<{
  moduleId: string
}>()

defineEmits<{
  'open-zone-drawer': []
  'zone-changed': []
}>()
</script>
