<template>
  <div class="min-h-screen bg-gray-100 text-gray-800 p-4 sm:p-8">
    <div class="max-w-7xl mx-auto">
      
      <main>
        <ClientOnly>
          <!-- PANEL MODULE -->
          <div v-if="deviceStatus" class="bg-white rounded-xl shadow-sm border border-gray-100 transition-all mt-6">
            
            <!-- Header du Panel -->
            <div class="p-4 bg-gray-50 border-b border-gray-100">
              <div class="flex flex-wrap justify-between items-start gap-4">
                <div class="flex items-center gap-3">
                  <!-- Icone Module Stylisée --> 
                  <div class="flex items-center justify-center w-10 h-10 bg-white rounded-full shadow-sm border border-gray-200 text-emerald-600">
                    <Icon name="tabler:cloud-computing" size="24" />
                  </div>
                  
                  <div>
                    <div class="flex items-center gap-2">
                      <h2 class="font-bold text-lg text-gray-800">{{ currentModuleName }}</h2>
                    </div>
                    <div class="text-xs text-gray-500">{{ deviceStatus.system?.ip }} • Uptime: {{ formatUptime(deviceStatus.system?.uptime) }}</div>
                  </div>
                </div>
                
                <!-- Hardware ESP32 -->
                <div class="flex items-center gap-4 text-xs text-gray-500">
                  <div class="flex items-center gap-2">
                    <span class="text-gray-400">MCU:</span>
                    <span class="font-mono text-gray-700">{{ deviceStatus.system?.chip?.model || '--' }}</span>
                    <span class="text-gray-400">Rev {{ deviceStatus.system?.chip?.rev || '?' }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-gray-400">Flash:</span>
                    <span class="font-mono text-gray-700">{{ formatFlash(deviceStatus.system?.chip?.flash_kb) }}</span>
                  </div>
                  
                  <!-- RSSI / WiFi Icon (Tabler) -->
                  <div class="relative group/rssi cursor-help p-1">
                    <Icon :name="wifiIcon" class="w-5 h-5" :class="rssiClass" />
                    
                    <!-- Tooltip RSSI -->
                    <div class="absolute top-full right-0 mt-1 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover/rssi:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
                      Signal: {{ deviceStatus.system?.rssi || '--' }} dBm
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Grille des Capteurs -->
            <div class="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              
              <SensorMiniCard 
                label="CO2" 
                :sensor="deviceStatus.sensors?.co2" 
                color="emerald"
                :history="sensorData?.co2 || []"
                :is-graph-open="selectedGraphSensor === 'co2'"
                @toggle-graph="toggleGraph('co2')"
              />
              
              <SensorMiniCard 
                label="Température" 
                :sensor="deviceStatus.sensors?.temperature" 
                color="orange"
                :history="sensorData?.temp || []"
                :is-graph-open="selectedGraphSensor === 'temp'"
                @toggle-graph="toggleGraph('temp')"
              />
              
              <SensorMiniCard 
                label="Humidité" 
                :sensor="deviceStatus.sensors?.humidity" 
                color="blue"
                :history="sensorData?.hum || []"
                :is-graph-open="selectedGraphSensor === 'hum'"
                @toggle-graph="toggleGraph('hum')"
              />
              
              <SensorMiniCard 
                label="PM2.5" 
                :sensor="deviceStatus.sensors?.pm25" 
                color="violet"
                :history="[]"
                :is-graph-open="selectedGraphSensor === 'pm25'"
                @toggle-graph="toggleGraph('pm25')"
              />
              
              <SensorMiniCard 
                label="COV" 
                :sensor="deviceStatus.sensors?.voc" 
                color="pink"
                :history="[]"
                :is-graph-open="selectedGraphSensor === 'voc'"
                @toggle-graph="toggleGraph('voc')"
              />
              
              <SensorMiniCard 
                label="Pression" 
                :sensor="deviceStatus.sensors?.pressure" 
                color="cyan"
                :history="[]"
                :is-graph-open="selectedGraphSensor === 'pressure'"
                @toggle-graph="toggleGraph('pressure')"
              />

            </div>

            <!-- Grand Graphique Détaillé -->
            <div v-if="selectedGraphSensor" class="border-t border-gray-100 bg-gray-50 p-6 animate-fade-in">
               <div class="flex justify-between items-center mb-4">
                  <h3 class="font-bold text-gray-700 uppercase text-sm flex items-center gap-2">
                     <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                     Historique détaillé : {{ getSensorLabel(selectedGraphSensor) }}
                  </h3>
                  <button @click="selectedGraphSensor = null" class="text-gray-400 hover:text-red-500 text-sm">Fermer</button>
               </div>
               
               <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-200 h-80">
                  <SensorChart 
                    v-if="getSensorHistory(selectedGraphSensor).length > 0"
                    :data="getSensorHistory(selectedGraphSensor)"
                    :color="getSensorColor(selectedGraphSensor)"
                    :unit="getSensorUnit(selectedGraphSensor)"
                  />
                  <div v-else class="h-full flex items-center justify-center text-gray-400">
                    Pas assez de données pour afficher le graphique détaillé.
                  </div>
               </div>
            </div>

          </div>
          
          <!-- Loading state -->
          <div v-else class="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-400 mt-6">
            <div class="animate-spin w-8 h-8 border-2 border-gray-300 border-t-emerald-500 rounded-full mx-auto mb-4"></div>
            Chargement du module...
          </div>
          
          <template #fallback>
            <div class="p-8 text-center text-gray-500">Chargement...</div>
          </template>
        </ClientOnly>
      </main>
    </div>
  </div>
</template>

<script setup>
import { io } from 'socket.io-client'

const modules = ref([])
const selectedModuleId = ref('')
const deviceStatus = ref(null)
const sensorData = ref({ co2: [], temp: [], hum: [] })
const selectedGraphSensor = ref(null)

const formatUptime = (seconds) => {
   if (!seconds && seconds !== 0) return '--'
   const h = Math.floor(seconds / 3600)
   const m = Math.floor((seconds % 3600) / 60)
   return `${h}h ${m}m`
}

const formatFlash = (kb) => {
  if (!kb) return '--'
  return Math.round(kb / 1024) + 'MB'
}

const isOnline = computed(() => !!deviceStatus.value)

const rssiClass = computed(() => {
  const rssi = deviceStatus.value?.system?.rssi || -99
  return rssi > -70 ? 'text-green-600' : 'text-orange-500'
})

const wifiIcon = computed(() => {
  const rssi = deviceStatus.value?.system?.rssi
  if (!rssi) return 'tabler:wifi-off'
  if (rssi > -60) return 'tabler:wifi'
  if (rssi > -75) return 'tabler:wifi-2'
  if (rssi > -85) return 'tabler:wifi-1'
  return 'tabler:wifi-0'
})

const rssiLevel = computed(() => {
  const rssi = deviceStatus.value?.system?.rssi || -99
  if (rssi > -60) return 3
  if (rssi > -75) return 2
  if (rssi > -85) return 1
  return 0
})

const currentModuleName = computed(() => {
    const mod = modules.value.find(m => m.id === selectedModuleId.value)
    return mod?.name || selectedModuleId.value
})

const toggleGraph = (sensorType) => {
  if (selectedGraphSensor.value === sensorType) {
    selectedGraphSensor.value = null
  } else {
    selectedGraphSensor.value = sensorType
  }
}

const getSensorLabel = (type) => {
  const map = { co2: 'CO2', temp: 'Température', hum: 'Humidité', pm25: 'PM2.5', voc: 'COV', pressure: 'Pression' }
  return map[type] || type
}

const getSensorColor = (type) => {
  const map = { co2: '#10b981', temp: '#f97316', hum: '#3b82f6', pm25: '#8b5cf6', voc: '#ec4899', pressure: '#06b6d4' }
  return map[type] || '#9ca3af'
}

const getSensorUnit = (type) => {
  return deviceStatus.value?.sensors?.[type === 'temp' ? 'temperature' : (type === 'hum' ? 'humidity' : type)]?.unit || ''
}

const getSensorHistory = (type) => {
  if (type === 'co2') return sensorData.value.co2
  if (type === 'temp') return sensorData.value.temp
  if (type === 'hum') return sensorData.value.hum
  return []
}

// --- Initialization ---
const modulesList = ref(null)

// Fetch dashboard data when module changes (côté client uniquement)
const loadDashboard = async (moduleId) => {
  if (!moduleId) return
  
  try {
    const dashboardData = await $fetch(`/api/dashboard?module=${moduleId}&days=1&_t=${Date.now()}`)
    deviceStatus.value = dashboardData.status
    
    const process = (arr) => {
      if (!arr) return []
      return arr.map(m => ({ ...m, time: new Date(m.time) })).reverse()
    }
    
    sensorData.value = {
      co2: process(dashboardData.sensors?.co2 || []),
      temp: process(dashboardData.sensors?.temp || []),
      hum: process(dashboardData.sensors?.hum || [])
    }
  } catch (e) {
    console.error("Erreur fetch dashboard:", e)
  }
}

watch(selectedModuleId, (newModuleId) => loadDashboard(newModuleId))

let socket
const config = useRuntimeConfig()

onMounted(async () => {
  // Test 1: Réactiver uniquement l'appel modules
  try {
    const data = await $fetch('/api/modules')
    modulesList.value = data
    modules.value = data
    if (modules.value.length > 0 && !selectedModuleId.value) {
      selectedModuleId.value = modules.value[0].id
    }
  } catch (e) {
    console.error("Erreur fetch modules:", e)
  }

  // Test 2: Réactiver le dashboard
  if (selectedModuleId.value) {
    loadDashboard(selectedModuleId.value)
  }

  // Test 3: Réactiver socket.io
  socket = io(config.public.socketUrl, { transports: ['websocket'], upgrade: false })

  socket.on('mqtt:data', (message) => {
      if (!selectedModuleId.value || !message.topic.startsWith(selectedModuleId.value)) return

      if (message.topic.endsWith('/status') && message.metadata) {
          deviceStatus.value = message.metadata
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
})

onUnmounted(() => {
  if (socket) socket.disconnect()
})
</script>
