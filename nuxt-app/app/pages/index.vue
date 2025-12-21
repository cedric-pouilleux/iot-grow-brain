<template>
  <div class="min-h-screen dark:bg-gray-900 text-gray-800 dark:text-gray-100 p-4 sm:p-8">
    <ZoneDrawer 
      :is-open="isZoneDrawerOpen"
      :current-device-id="activeDeviceForZone"
      @close="isZoneDrawerOpen = false" 
      @zone-changed="handleZoneChanged"
    />
    <div class="max-w-7xl mx-auto">
      <main>
        <ClientOnly>
          <div v-if="isLoading" class="text-center py-8">
            <div
              class="animate-spin w-8 h-8 border-2 border-gray-300 border-t-emerald-500 rounded-full mx-auto mb-4"
            ></div>
            <div class="text-gray-400">Chargement des modules...</div>
          </div>

          <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 m-4">
            <div class="text-lg font-semibold mb-2 text-red-700">Erreur</div>
            <div class="text-sm text-red-600">{{ error }}</div>
            <button
              class="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              @click="reloadPage"
            >
              Réessayer
            </button>
          </div>

          <div v-else-if="modules.length === 0" class="text-center py-8 text-gray-500">
            Aucun module trouvé
          </div>

          <div v-else class="space-y-8">
            <div v-for="group in modulesByZone" :key="group.zoneId ?? 'unassigned'" class="space-y-4">
              <h2 class="text-lg font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-2">
                <Icon name="tabler:map-pin" class="w-5 h-5" />
                {{ group.zoneName }}
                <span class="text-sm font-normal text-gray-400">({{ group.modules.length }})</span>
              </h2>
              
              <div class="space-y-6">
                <ModulePanel
                  v-for="module in group.modules"
                  :key="module.id"
                  :module-id="module.id"
                  :module-name="module.name"
                  :device-status="getModuleDeviceStatus(module.id)"
                  :sensor-data="getModuleSensorData(module.id)"
                  :is-history-loading="isHistoryLoading"
                  @zone-changed="handleZoneChanged"
                  @open-zone-drawer="openZoneDrawer"
                />
              </div>
            </div>
          </div>

          <template #fallback>
            <div class="p-8 text-center text-gray-500">Chargement...</div>
          </template>
        </ClientOnly>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MqttMessage } from '../types'
import ModulePanel from '@benchmark-module-sensors/components/BenchModulePanel.vue' 
import ZoneDrawer from '~/features/zones/components/ZoneDrawer.vue'
import { useDatabase } from '~/features/modules/common/composables/useDatabase'
import { useModules, useModulesData } from '~/features/modules/common/composables'
import { useDashboard } from '~/composables/useDashboard'
import { useMqtt } from '~/features/mqtt/composables/useMqtt'
import { useZones } from '~/features/zones/composables/useZones'
import { useChartSettings } from '~/features/modules/common/sensors-module-options/composables'

interface ModuleGroup {
  zoneId: string | null
  zoneName: string
  modules: typeof modules.value
}

const { loadDbSize } = useDatabase()
const { modules, error: modulesError, loadModules, addModuleFromTopic } = useModules()
const { getModuleDeviceStatus, getModuleSensorData, handleModuleMessage, loadModuleDashboard } = useModulesData()

const {
  isLoading: dashboardLoading,
  error: dashboardError,
  loadDashboard: fetchDashboard,
} = useDashboard()

const isInitialLoading = ref(true)
const isHistoryLoading = ref(false)
const isLoading = computed(() => isInitialLoading.value || dashboardLoading.value)
const error = computed(() => modulesError.value || dashboardError.value)
// Chart settings (persisted in localStorage)
const { graphDuration } = useChartSettings()

/**
 * Convert graphDuration string to days for API
 */
const durationToDays = (duration: string): number => {
  switch (duration) {
    case '1h': return 1 // API minimum is 1 day, frontend filters further
    case '6h': return 1
    case '12h': return 1
    case '24h': return 1
    case '7j': return 7
    default: return 7
  }
}

// Zone drawer state
const isZoneDrawerOpen = ref(false)
const activeDeviceForZone = ref<string | null>(null)

// Zones composable for refresh
const { zones, fetchZones } = useZones()

const modulesByZone = computed<ModuleGroup[]>(() => {
  const groups: ModuleGroup[] = []
  const assignedModuleIds = new Set<string>()

  // Group modules by zone
  for (const zone of zones.value) {
    const zoneModules = modules.value.filter(m => 
      zone.devices?.some(d => d.moduleId === m.id)
    )
    if (zoneModules.length > 0) {
      groups.push({
        zoneId: zone.id,
        zoneName: zone.name,
        modules: zoneModules
      })
      zoneModules.forEach(m => assignedModuleIds.add(m.id))
    }
  }

  // Add unassigned modules at the end
  const unassigned = modules.value.filter(m => !assignedModuleIds.has(m.id))
  if (unassigned.length > 0) {
    groups.push({
      zoneId: null,
      zoneName: 'Non assignés',
      modules: unassigned
    })
  }

  return groups
})

/**
 * Open zone drawer for a specific device
 */
const openZoneDrawer = (moduleId: string) => {
  activeDeviceForZone.value = moduleId
  isZoneDrawerOpen.value = true
}

/**
 * Handle zone changes - refresh zones list only (status will update via MQTT/next refresh)
 */
const handleZoneChanged = async () => {
  // Refresh zones list only - avoid reloading all module data
  await fetchZones()
}

/**
 * Handle incoming MQTT message
 * Extracts module ID and routes message to appropriate handler
 */
const handleMqttMessage = (message: MqttMessage): void => {
  const topicParts = message.topic.split('/')
  if (topicParts.length < 2) return

  const moduleId = topicParts[0]

  // Add module if it doesn't exist
  addModuleFromTopic(message.topic)

  // Process message for this module
  handleModuleMessage(moduleId, message)
}

// MQTT connection
const { connect: connectMqtt, disconnect: disconnectMqtt } = useMqtt({
  onMessage: handleMqttMessage,
})

/**
 * Load dashboard data for all modules (status + history)
 * Uses graphDuration to determine how many days of history to load
 */
const loadAllDashboards = async (): Promise<void> => {
  const days = durationToDays(graphDuration.value)
  const promises = modules.value.map(async module => {
    const result = await fetchDashboard(module.id, days)
    if (result) {
      loadModuleDashboard(module.id, result)
    }
  })
  await Promise.all(promises)
}



/**
 * Reload history only for all modules (when duration changes)
 */
const loadHistoryForAllModules = async (): Promise<void> => {
  isHistoryLoading.value = true
  const days = durationToDays(graphDuration.value)
  
  const { loadHistory } = useDashboard()
  
  const promises = modules.value.map(async module => {
    const sensors = await loadHistory(module.id, days)
    if (sensors) {
      loadModuleDashboard(module.id, { status: null, sensors })
    }
  })
  await Promise.all(promises)
  isHistoryLoading.value = false
}

// Watch for graph duration changes
watch(graphDuration, async () => {
  if (modules.value.length > 0) {
    await loadHistoryForAllModules()
  }
})

/**
 * Reload the page (used for error recovery)
 */
const reloadPage = (): void => {
  if (typeof window !== 'undefined') {
    window.location.reload()
  }
}

onMounted(async () => {
  isInitialLoading.value = true
  await Promise.all([loadModules(), fetchZones(), loadDbSize()])
  connectMqtt()
  await loadAllDashboards()
  isInitialLoading.value = false
})

onUnmounted(() => {
  disconnectMqtt()
})
</script>
