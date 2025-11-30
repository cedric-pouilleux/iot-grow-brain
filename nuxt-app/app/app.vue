<template>
  <div class="min-h-screen bg-gray-100 text-gray-800 p-4 sm:p-8">
    <div class="max-w-7xl mx-auto">
      <main>
        <ClientOnly>
          <div v-if="isLoading" class="text-center py-8">
            <div class="animate-spin w-8 h-8 border-2 border-gray-300 border-t-emerald-500 rounded-full mx-auto mb-4"></div>
            <div class="text-gray-400">Chargement des modules...</div>
          </div>
          
          <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 m-4">
            <div class="text-lg font-semibold mb-2 text-red-700">Erreur</div>
            <div class="text-sm text-red-600">{{ error }}</div>
            <button @click="reloadPage" class="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
              Réessayer
            </button>
          </div>

          <div v-else-if="modules.length === 0" class="text-center py-8 text-gray-500">
            Aucun module trouvé
          </div>

          <div v-else class="space-y-6">
            <ModulePanel
              v-for="module in modules"
              :key="module.id"
              :module-id="module.id"
              :module-name="module.name"
              :device-status="getModuleDeviceStatus(module.id)"
              :sensor-data="getModuleSensorData(module.id)"
            />
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
import ModulePanel from './components/ModulePanel.vue'
import { useDatabase } from './composables/useDatabase'
import { useModules } from './composables/useModules'
import { useModulesData } from './composables/useModulesData'
import { useDashboard } from './composables/useDashboard'
import { useMqtt } from './composables/useMqtt'

// Composables
const { loadDbSize } = useDatabase()
const { 
  modules,
  error: modulesError,
  loadModules, 
  addModuleFromTopic 
} = useModules()

const {
  getModuleDeviceStatus,
  getModuleSensorData,
  handleModuleMessage,
  loadModuleDashboard
} = useModulesData()

const { 
  isLoading: dashboardLoading, 
  error: dashboardError, 
  loadDashboard: fetchDashboard 
} = useDashboard()

// État local
const isInitialLoading = ref(true)
const isLoading = computed(() => isInitialLoading.value || dashboardLoading.value)
const error = computed(() => modulesError.value || dashboardError.value)

// Gestion des messages MQTT
const handleMqttMessage = (message: any) => {
  // Extraire le moduleId du topic
  const topicParts = message.topic.split('/')
  if (topicParts.length < 2) return
  
  const moduleId = topicParts[0]
  
  // Ajouter le module s'il n'existe pas
  addModuleFromTopic(message.topic)
  
  // Traiter le message pour ce module
  handleModuleMessage(moduleId, message)
}

// Connexion MQTT
const { connect: connectMqtt, disconnect: disconnectMqtt } = useMqtt({
  onMessage: handleMqttMessage
})

// Charger le dashboard pour tous les modules
const loadAllDashboards = async () => {
  const promises = modules.value.map(async (module) => {
    const result = await fetchDashboard(module.id)
    if (result) {
      loadModuleDashboard(module.id, result)
    }
  })
  await Promise.all(promises)
}

// Recharger la page
const reloadPage = () => {
  if (typeof window !== 'undefined') {
    window.location.reload()
  }
}

// Initialisation
onMounted(async () => {
  isInitialLoading.value = true
  
  // Charger les modules et la taille de la DB en parallèle
  await Promise.all([
    loadModules(),
    loadDbSize()
  ])
  
  // Connecter MQTT
  connectMqtt()
  
  // Charger les dashboards de tous les modules
  await loadAllDashboards()
  
  isInitialLoading.value = false
})

onUnmounted(() => {
  disconnectMqtt()
})
</script>
