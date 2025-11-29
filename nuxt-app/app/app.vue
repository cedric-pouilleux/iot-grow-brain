<template>
  <div class="min-h-screen bg-gray-100 text-gray-800 p-4 sm:p-8">
    <div class="max-w-7xl mx-auto">
      
      <main>
        <ClientOnly>
          
            <ModuleHeader 
              :module-name="currentModuleName"
              :rssi="deviceStatus?.system?.rssi"
              :device-status="deviceStatus"
              :formatted-uptime="formatUptime(calculatedUptime)"
              @toggle-config="showConfig = !showConfig"
            /> 

          <!-- SENSOR GRID -->
          <SensorGrid 
            :sensors="sensorList"
            :selected-graph-sensor="selectedGraphSensor"
            :device-status="deviceStatus"
            :sensor-data="sensorData"
            :module-id="selectedModuleId"
            @toggle-graph="toggleGraph"
          />

          <!-- SENSOR DETAIL GRAPH -->
          <SensorDetailGraph 
            v-if="selectedGraphSensor"
            :selected-sensor="selectedGraphSensor"
            :history="getSensorHistory(selectedGraphSensor)"
            :sensor-label="getSensorLabel(selectedGraphSensor)"
            :sensor-color="getSensorColor(selectedGraphSensor)"
            :sensor-unit="getSensorUnit(selectedGraphSensor)"
            @close="selectedGraphSensor = null"
          />
          
          <!-- Loading/Error states (affichés en overlay si nécessaire) -->
          <div v-if="isLoading" class="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
            <div class="text-center">
              <div class="animate-spin w-8 h-8 border-2 border-gray-300 border-t-emerald-500 rounded-full mx-auto mb-4"></div>
              <div class="text-gray-400">Chargement...</div>
            </div>
          </div>
          
          <div v-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 m-4">
            <div class="text-lg font-semibold mb-2 text-red-700">Erreur</div>
            <div class="text-sm text-red-600">{{ error }}</div>
            <button @click="reloadPage" class="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
              Réessayer
            </button>
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
import { io, Socket } from 'socket.io-client'
import ModuleHeader from './components/ModuleHeader.vue' 
import SensorGrid from './components/SensorGrid.vue'
import SensorDetailGraph from './components/SensorDetailGraph.vue'
import { formatUptime } from './utils/time'
import { getSensorLabel, getSensorColor, getSensorUnit, normalizeSensorType } from './utils/sensors'
import { processSensorData } from './utils/data-processing'
import { useDatabase } from './composables/useDatabase'
import type { Module, DeviceStatus, SensorData, DashboardData, MqttMessage } from './types'

// État réactif
const modules = ref<Module[]>([])
const selectedModuleId = ref<string>('')
const deviceStatus = ref<DeviceStatus | null>(null)
const sensorData = ref<SensorData>({ co2: [], temp: [], hum: [] })
const selectedGraphSensor = ref<string | null>(null)
const showConfig = ref(false)
const isLoading = ref(true)
const error = ref<string | null>(null)

// Gestion de la base de données (logique extraite, non affichée pour le moment)
const { loadDbSize } = useDatabase()

let socket: Socket | null = null

// Configuration des capteurs
interface SensorConfig {
  key: string
  label: string
  color: string
}

const sensorList: SensorConfig[] = [
  { key: 'co2', label: 'CO2', color: 'emerald' },
  { key: 'temperature', label: 'Température', color: 'orange' },
  { key: 'humidity', label: 'Humidité', color: 'blue' },
  { key: 'pm25', label: 'PM2.5', color: 'violet' },
  { key: 'voc', label: 'COV', color: 'pink' },
  { key: 'pressure', label: 'Pression', color: 'cyan' }
]

// Computed
const currentModuleName = computed(() => {
  const mod = modules.value.find(m => m.id === selectedModuleId.value)
  return mod?.name || selectedModuleId.value
})

const calculatedUptime = computed(() => {
  if (!deviceStatus.value?.system?.uptime_start) return null
  const now = Math.floor(Date.now() / 1000)
  const uptimeStart = deviceStatus.value.system.uptime_start
  if (!deviceStatus.value.system._config_received_at) {
    deviceStatus.value.system._config_received_at = now
    deviceStatus.value.system._uptime_start_offset = uptimeStart
  }
  const elapsedSinceConfig = now - deviceStatus.value.system._config_received_at
  return deviceStatus.value.system._uptime_start_offset! + elapsedSinceConfig
})

// Fonctions
const toggleGraph = (sensorType: string) => {
  const normalizedType = normalizeSensorType(sensorType)
  if (selectedGraphSensor.value === normalizedType) {
    selectedGraphSensor.value = null
  } else {
    selectedGraphSensor.value = normalizedType
  }
}

const getSensorHistory = (type: string) => {
  const typeMap: Record<string, keyof SensorData> = {
    'co2': 'co2',
    'temperature': 'temp',
    'humidity': 'hum',
    'temp': 'temp',
    'hum': 'hum'
  }
  const dataKey = typeMap[type] || type
  return sensorData.value[dataKey as keyof SensorData] || []
}

const reloadPage = () => {
  if (typeof window !== 'undefined') {
    window.location.reload()
  }
}

const loadDashboard = async (moduleId: string) => {
  if (!moduleId) return
  
  try {
    const dashboardData = await $fetch<DashboardData>(`/api/dashboard?module=${moduleId}&days=1&_t=${Date.now()}`)
    
    deviceStatus.value = dashboardData.status
    
    sensorData.value = {
      co2: processSensorData(dashboardData.sensors?.co2 || []),
      temp: processSensorData(dashboardData.sensors?.temp || []),
      hum: processSensorData(dashboardData.sensors?.hum || [])
    }
  } catch (e) {
    console.error("❌ Erreur fetch dashboard:", e)
  }
}

// Watchers
watch(selectedModuleId, (newModuleId) => {
  if (newModuleId) {
    loadDashboard(newModuleId)
  }
})

// Initialisation
onMounted(async () => {
  isLoading.value = true
  error.value = null
  
  const promises: Promise<any>[] = []
  
  // 1. Charger les modules
  promises.push(
    $fetch<Module[]>('/api/modules', { timeout: 5000, retry: 0 })
      .then(data => {
        modules.value = data
        if (modules.value.length > 0 && !selectedModuleId.value) {
          selectedModuleId.value = modules.value[0].id
        }
      })
      .catch((e: Error) => {
        console.error("Erreur fetch modules:", e)
        error.value = `Impossible de charger les modules: ${e.message || 'Erreur de connexion'}`
      })
  )
  
  // 2. Charger la taille de la base de données (non bloquant, logique extraite)
  promises.push(loadDbSize())
  
  // 3. Initialiser WebSocket (non bloquant)
  const config = useRuntimeConfig()
  try {
    socket = io(config.public.socketUrl, { transports: ['websocket'], upgrade: false })
    
    socket.on('mqtt:data', (message: MqttMessage) => {
      if (!selectedModuleId.value || !message.topic.startsWith(selectedModuleId.value)) return

      if ((message.topic.endsWith('/system') || message.topic.endsWith('/system/config') || message.topic.endsWith('/sensors/status') || message.topic.endsWith('/sensors/config') || message.topic.endsWith('/hardware/config')) && message.metadata) {
          // Initialiser deviceStatus si nécessaire
          if (!deviceStatus.value) {
              deviceStatus.value = { system: {}, sensors: {}, hardware: {}, sensorsConfig: {} }
          }
          
          // Fusionner les données selon le topic
          if (message.topic.endsWith('/system')) {
              // Données dynamiques (rssi, memory dynamique) - fusion avec config existante
              if (!deviceStatus.value.system) {
                  deviceStatus.value.system = {}
              }
              deviceStatus.value.system.rssi = message.metadata.rssi
              // Fusionner seulement les valeurs dynamiques de memory (sans écraser heap_total_kb)
              if (message.metadata.memory) {
                  if (!deviceStatus.value.system.memory) {
                      deviceStatus.value.system.memory = {}
                  }
                  if (message.metadata.memory.heap_free_kb !== undefined) {
                      deviceStatus.value.system.memory.heap_free_kb = message.metadata.memory.heap_free_kb
                  }
                  if (message.metadata.memory.heap_min_free_kb !== undefined) {
                      deviceStatus.value.system.memory.heap_min_free_kb = message.metadata.memory.heap_min_free_kb
                  }
                  if (message.metadata.memory.psram) {
                      deviceStatus.value.system.memory.psram = { ...deviceStatus.value.system.memory.psram, ...message.metadata.memory.psram }
                  }
              }
          } else if (message.topic.endsWith('/system/config')) {
              // Données statiques système (ip, mac, uptime_start, flash, memory.heap_total_kb) - envoyé une seule fois
              if (!deviceStatus.value.system) {
                  deviceStatus.value.system = {}
              }
              deviceStatus.value.system.ip = message.metadata.ip
              deviceStatus.value.system.mac = message.metadata.mac
              deviceStatus.value.system.uptime_start = message.metadata.uptime_start
              deviceStatus.value.system.flash = message.metadata.flash
              // Stocker le timestamp de réception pour calculer l'uptime précisément
              deviceStatus.value.system._config_received_at = Math.floor(Date.now() / 1000)
              deviceStatus.value.system._uptime_start_offset = message.metadata.uptime_start
              
              if (message.metadata.memory) {
                  if (!deviceStatus.value.system.memory) {
                      deviceStatus.value.system.memory = {}
                  }
                  if (message.metadata.memory.heap_total_kb !== undefined) {
                      deviceStatus.value.system.memory.heap_total_kb = message.metadata.memory.heap_total_kb
                  }
                  if (message.metadata.memory.psram) {
                      deviceStatus.value.system.memory.psram = message.metadata.memory.psram
                  }
              }
          } else if (message.topic.endsWith('/sensors/status')) {
              // Stocker uniquement status et value (pas de modèles)
              if (!deviceStatus.value.sensors) {
                  deviceStatus.value.sensors = {}
              }
              Object.keys(message.metadata).forEach(sensorName => {
                  if (!deviceStatus.value.sensors[sensorName]) {
                      deviceStatus.value.sensors[sensorName] = {}
                  }
                  deviceStatus.value.sensors[sensorName] = {
                      ...deviceStatus.value.sensors[sensorName],
                      status: message.metadata[sensorName].status,
                      value: message.metadata[sensorName].value
                  }
              })
          } else if (message.topic.endsWith('/sensors/config')) {
              // Stocker la config des capteurs (modèles) dans un objet séparé
              deviceStatus.value.sensorsConfig = { ...deviceStatus.value.sensorsConfig, ...message.metadata }
          } else if (message.topic.endsWith('/hardware/config')) {
              // Stocker la config hardware statique
              deviceStatus.value.hardware = { ...deviceStatus.value.hardware, ...message.metadata }
              }
      }
      else if (message.value !== null) {
          const newData = { time: new Date(message.time), value: message.value }
          
          if (message.topic.endsWith('/co2')) {
              sensorData.value.co2.push(newData)
              if (sensorData.value.co2.length > 100) sensorData.value.co2.shift()
          }
          else if (message.topic.endsWith('/temperature')) {
              sensorData.value.temp.push(newData)
              if (sensorData.value.temp.length > 100) sensorData.value.temp.shift()
          }
          else if (message.topic.endsWith('/humidity')) {
              sensorData.value.hum.push(newData)
              if (sensorData.value.hum.length > 100) sensorData.value.hum.shift()
          }
      }
    })
  } catch (e) {
    console.error("Erreur connexion WebSocket:", e)
  }
  
  // Attendre que les modules soient chargés avant de charger le dashboard
  await promises[0]
  
  // Charger le dashboard si un module est sélectionné
  if (selectedModuleId.value) {
    loadDashboard(selectedModuleId.value)
  }
  
  isLoading.value = false
})

onUnmounted(() => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
})
</script>
