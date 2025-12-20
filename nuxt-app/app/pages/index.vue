<template>
  <div class="min-h-screen dark:bg-gray-900 text-gray-800 dark:text-gray-100 p-4 sm:p-8">
    <!-- Zone Drawer -->
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
            <!-- Iterate over zone groups -->
            <div v-for="group in modulesByZone" :key="group.zoneId ?? 'unassigned'" class="space-y-4">
              <!-- Zone Header -->
              <h2 class="text-lg font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-2">
                <Icon name="tabler:map-pin" class="w-5 h-5" />
                {{ group.zoneName }}
                <span class="text-sm font-normal text-gray-400">({{ group.modules.length }})</span>
              </h2>
              
              <!-- Modules in this zone -->
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
// Types
import type { MqttMessage } from '../types'

// Components
import ModulePanel from '@benchmark-module-sensors/components/BenchModulePanel.vue' 
import ZoneDrawer from '../components/ZoneDrawer.vue'

// Composables
import { useDatabase } from '../composables/useDatabase'
import { useModules, useModulesData } from '../features/modules/common/composables'
import { useDashboard } from '../composables/useDashboard'
import { useMqtt } from '../composables/useMqtt'
import { useZones } from '../composables/useZones'

// Database
const { loadDbSize } = useDatabase()

// Modules
const { modules, error: modulesError, loadModules, addModuleFromTopic } = useModules()

// Module data (device status & sensor data)
const { getModuleDeviceStatus, getModuleSensorData, handleModuleMessage, loadModuleDashboard, updateModuleSensorData } =
  useModulesData()

// Dashboard
const {
  isLoading: dashboardLoading,
  error: dashboardError,
  loadDashboard: fetchDashboard,
  loadHistory: fetchHistory,
} = useDashboard()

// Local state
const isInitialLoading = ref(true)
const isHistoryLoading = ref(false)
const isLoading = computed(() => isInitialLoading.value || dashboardLoading.value)
const error = computed(() => modulesError.value || dashboardError.value)
const selectedRange = ref(7) // Défaut: 7 jours pour supporter toutes les durées de graphe

// Zone drawer state
const isZoneDrawerOpen = ref(false)
const activeDeviceForZone = ref<string | null>(null)

// Zones composable for refresh
const { zones, fetchZones } = useZones()

// ============================================================================
// Modules grouped by zones
// ============================================================================

interface ModuleGroup {
  zoneId: string | null
  zoneName: string
  modules: typeof modules.value
}

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
 */
const loadAllDashboards = async (): Promise<void> => {
  const promises = modules.value.map(async module => {
    const result = await fetchDashboard(module.id, selectedRange.value)
    if (result) {
      loadModuleDashboard(module.id, result)
    }
  })
  await Promise.all(promises)
}

/**
 * Handle time range change - only reload history, not status
 */
const handleRangeChange = async () => {
  console.log('handleRangeChange: setting isHistoryLoading = true')
  isHistoryLoading.value = true
  try {
    const promises = modules.value.map(async module => {
      const sensors = await fetchHistory(module.id, selectedRange.value)
      if (sensors) {
        updateModuleSensorData(module.id, sensors)
      }
    })
    await Promise.all(promises)
  } finally {
    console.log('handleRangeChange: setting isHistoryLoading = false')
    isHistoryLoading.value = false
  }
}

/**
 * Reload the page (used for error recovery)
 */
const reloadPage = (): void => {
  if (typeof window !== 'undefined') {
    window.location.reload()
  }
}

// Initialization
onMounted(async () => {
  isInitialLoading.value = true

  // Load modules, zones and DB size in parallel
  await Promise.all([loadModules(), fetchZones(), loadDbSize()])

  // Connect to MQTT
  connectMqtt()

  // Load dashboards for all modules
  await loadAllDashboards()

  isInitialLoading.value = false
})

onUnmounted(() => {
  disconnectMqtt()
})
</script>
