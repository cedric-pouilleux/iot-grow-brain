<template>
  <div class="min-h-screen bg-gray-100 text-gray-800 p-4 sm:p-8">
    <div class="max-w-7xl mx-auto">
      
      <main>
        <ClientOnly>
          <!-- PANEL MODULE -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 transition-all mt-6">
            
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
                    <div class="text-xs text-gray-500">Uptime: {{ formatUptime(calculatedUptime) }}</div>
                  </div>
                </div>
                
                <!-- Actions -->
                <div class="flex items-center gap-3">
                  <!-- Informations Hardware -->
                  <button 
                    @click="showHardwareInfo = !showHardwareInfo"
                    class="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    title="Informations Hardware"
                  >
                    <Icon name="ph:info-bold" class="w-5 h-5 text-gray-600" />
                  </button>
                  
                  <!-- Configuration -->
                  <button 
                    @click="showConfig = !showConfig"
                    class="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    title="Configuration"
                  >
                    <Icon name="ph:gear-bold" class="w-5 h-5 text-gray-600" />
                  </button>
                  
                  <!-- RSSI / WiFi Icon (Tabler) -->
                  <div class="relative group/rssi cursor-help p-1">
                    <Icon :name="wifiIcon" class="w-5 h-5" :class="rssiClass" />
                    
                    <!-- Tooltip RSSI -->
                    <div class="absolute top-full right-0 mt-1 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover/rssi:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
                      Signal: {{ deviceStatus?.system?.rssi || '--' }} dBm
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Grille des Capteurs -->
            <div class="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              
              <SensorMiniCard 
                label="CO2" 
                :sensor="getSensorData('co2')" 
                color="emerald"
                :history="sensorData?.co2 || []"
                :is-graph-open="selectedGraphSensor === 'co2'"
                @toggle-graph="toggleGraph('co2')"
              />
              
              <SensorMiniCard 
                label="Température" 
                :sensor="getSensorData('temperature')" 
                color="orange"
                :history="sensorData?.temp || []"
                :is-graph-open="selectedGraphSensor === 'temp'"
                @toggle-graph="toggleGraph('temp')"
              />
              
              <SensorMiniCard 
                label="Humidité" 
                :sensor="getSensorData('humidity')" 
                color="blue"
                :history="sensorData?.hum || []"
                :is-graph-open="selectedGraphSensor === 'hum'"
                @toggle-graph="toggleGraph('hum')"
              />
              
              <SensorMiniCard 
                label="PM2.5" 
                :sensor="getSensorData('pm25')" 
                color="violet"
                :history="[]"
                :is-graph-open="selectedGraphSensor === 'pm25'"
                @toggle-graph="toggleGraph('pm25')"
              />
              
              <SensorMiniCard 
                label="COV" 
                :sensor="getSensorData('voc')" 
                color="pink"
                :history="[]"
                :is-graph-open="selectedGraphSensor === 'voc'"
                @toggle-graph="toggleGraph('voc')"
              />
              
              <SensorMiniCard 
                label="Pression" 
                :sensor="getSensorData('pressure')" 
                color="cyan"
                :history="[]"
                :is-graph-open="selectedGraphSensor === 'pressure'"
                @toggle-graph="toggleGraph('pressure')"
              />

            </div>

            <!-- Section Informations Système -->
            <div class="border-t border-gray-100 bg-gray-50">
              <button 
                @click="showSystemInfo = !showSystemInfo"
                class="w-full p-4 flex items-center justify-between hover:bg-gray-100 transition-colors"
              >
                <div class="flex items-center gap-3">
                  <Icon name="tabler:device-desktop" class="w-5 h-5 text-gray-600" />
                  <h3 class="font-semibold text-gray-700">Informations Système</h3>
                </div>
                <Icon 
                  :name="showSystemInfo ? 'tabler:chevron-up' : 'tabler:chevron-down'" 
                  class="w-5 h-5 text-gray-400"
                />
              </button>
              
              <div v-if="showSystemInfo" class="p-4 bg-white border-t border-gray-100">
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  
                  <!-- Réseau -->
                  <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h4 class="text-xs font-semibold text-gray-500 uppercase mb-3 flex items-center gap-2">
                      <Icon name="tabler:network" class="w-4 h-4" />
                      Réseau
                    </h4>
                    <div class="space-y-2 text-sm">
                      <div class="flex justify-between">
                        <span class="text-gray-600">Adresse IP</span>
                        <span class="font-mono text-gray-800">{{ deviceStatus?.system?.ip || '--' }}</span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-gray-600">MAC</span>
                        <span class="font-mono text-gray-800 text-xs">{{ deviceStatus?.system?.mac || '--' }}</span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-gray-600">Signal WiFi</span>
                        <span class="font-mono text-gray-800">{{ deviceStatus?.system?.rssi || '--' }} dBm</span>
                      </div>
                    </div>
                  </div>

                  <!-- Processeur -->
                  <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h4 class="text-xs font-semibold text-gray-500 uppercase mb-3 flex items-center gap-2">
                      <Icon name="tabler:cpu" class="w-4 h-4" />
                      Processeur
                    </h4>
                    <div class="space-y-2 text-sm">
                      <div class="flex justify-between">
                        <span class="text-gray-600">Modèle</span>
                        <span class="font-mono text-gray-800 text-xs">{{ deviceStatus?.hardware?.chip?.model || deviceStatus?.system?.chip?.model || '--' }}</span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-gray-600">Révision</span>
                        <span class="font-mono text-gray-800">{{ deviceStatus?.hardware?.chip?.rev || deviceStatus?.system?.chip?.rev || '--' }}</span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-gray-600">Fréquence</span>
                        <span class="font-mono text-gray-800">{{ deviceStatus?.hardware?.chip?.cpu_freq_mhz || deviceStatus?.system?.chip?.cpu_freq_mhz || '--' }} MHz</span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-gray-600">Uptime</span>
                        <span class="font-mono text-gray-800">{{ formatUptime(calculatedUptime) }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Mémoire Flash -->
                  <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h4 class="text-xs font-semibold text-gray-500 uppercase mb-3 flex items-center gap-2">
                      <Icon name="tabler:database" class="w-4 h-4" />
                      Mémoire Flash
                    </h4>
                    <div class="space-y-2 text-sm">
                      <div class="flex justify-between">
                        <span class="text-gray-600">Totale</span>
                        <span class="font-mono text-gray-800">
                          {{ deviceStatus?.hardware?.chip?.flash_kb ? formatSize(deviceStatus.hardware.chip.flash_kb) : '--' }}
                        </span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-gray-600">Sketch (code)</span>
                        <span class="font-mono text-gray-800">
                          {{ deviceStatus?.system?.flash?.used_kb ? formatSize(deviceStatus.system.flash.used_kb) : '--' }}
                        </span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-gray-600">Libre (OTA)</span>
                        <span class="font-mono text-gray-800">
                          {{ deviceStatus?.system?.flash?.free_kb ? formatSize(deviceStatus.system.flash.free_kb) : '--' }}
                        </span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-gray-600">Partitions système</span>
                        <span class="font-mono text-gray-800">
                          {{ deviceStatus?.system?.flash?.system_kb ? formatSize(deviceStatus.system.flash.system_kb) : '--' }}
                        </span>
                      </div>
                      <div class="mt-2 pt-2 border-t border-gray-300">
                        <div class="flex justify-between text-xs mb-1">
                          <span class="text-gray-500">Utilisation sketch</span>
                          <span class="text-gray-700">{{ getFlashUsagePercent() }}%</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            class="bg-blue-500 h-2 rounded-full transition-all"
                            :style="{ width: getFlashUsagePercent() + '%' }"
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Mémoire RAM (Heap) -->
                  <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h4 class="text-xs font-semibold text-gray-500 uppercase mb-3 flex items-center gap-2">
                      <Icon name="tabler:memory" class="w-4 h-4" />
                      Mémoire RAM
                    </h4>
                    <div class="space-y-2 text-sm">
                      <div class="flex justify-between">
                        <span class="text-gray-600">Totale</span>
                        <span class="font-mono text-gray-800">
                          {{ deviceStatus?.system?.memory?.heap_total_kb ? formatSize(deviceStatus.system.memory.heap_total_kb) : '--' }}
                        </span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-gray-600">Libre</span>
                        <span class="font-mono text-gray-800">{{ formatSize(deviceStatus.system?.memory?.heap_free_kb) }}</span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-gray-600">Min. libre</span>
                        <span class="font-mono text-gray-800">{{ formatSize(deviceStatus.system?.memory?.heap_min_free_kb) }}</span>
                      </div>
                      <div class="mt-2">
                        <div class="flex justify-between text-xs mb-1">
                          <span class="text-gray-500">Utilisation</span>
                          <span class="text-gray-700">{{ calculatedHeapUsedPercent.toFixed(1) }}%</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            class="h-2 rounded-full transition-all"
                            :class="getHeapColorClass()"
                            :style="{ width: calculatedHeapUsedPercent + '%' }"
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- PSRAM (si disponible) -->
                  <div v-if="deviceStatus?.system?.memory?.psram" class="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h4 class="text-xs font-semibold text-gray-500 uppercase mb-3 flex items-center gap-2">
                      <Icon name="tabler:memory-stick" class="w-4 h-4" />
                      PSRAM
                    </h4>
                    <div class="space-y-2 text-sm">
                      <div class="flex justify-between">
                        <span class="text-gray-600">Totale</span>
                        <span class="font-mono text-gray-800">{{ formatSize(deviceStatus?.system?.memory?.psram?.total_kb) }}</span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-gray-600">Libre</span>
                        <span class="font-mono text-gray-800">{{ formatSize(deviceStatus?.system?.memory?.psram?.free_kb) }}</span>
                      </div>
                      <div class="mt-2">
                        <div class="flex justify-between text-xs mb-1">
                          <span class="text-gray-500">Utilisation</span>
                          <span class="text-gray-700">{{ deviceStatus?.system?.memory?.psram?.used_percent?.toFixed(1) || '--' }}%</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            class="bg-purple-500 h-2 rounded-full transition-all"
                            :style="{ width: (deviceStatus?.system?.memory?.psram?.used_percent || 0) + '%' }"
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Base de données -->
                  <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h4 class="text-xs font-semibold text-gray-500 uppercase mb-3 flex items-center gap-2">
                      <Icon name="tabler:database" class="w-4 h-4" />
                      Base de données
                    </h4>
                    <div class="space-y-2 text-sm">
                      <div class="flex justify-between">
                        <span class="text-gray-600">Taille totale</span>
                        <span class="font-mono text-gray-800">{{ dbSize ? formatBytes(dbSize.total_size_bytes) : '--' }}</span>
                      </div>
                      <div v-if="dbSize" class="text-xs text-gray-500 italic mt-2">
                        Données des capteurs (TimescaleDB)
                      </div>
                      <button 
                        @click="showMetricsHistory = !showMetricsHistory"
                        class="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
                      >
                        {{ showMetricsHistory ? 'Masquer' : 'Voir' }} l'historique
                      </button>
                    </div>
                  </div>

                </div>

                <!-- Graphique historique des métriques -->
                <div v-if="showMetricsHistory" class="mt-4 p-4 bg-white border border-gray-200 rounded-lg">
                  <h4 class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Icon name="tabler:chart-line" class="w-4 h-4" />
                    Historique des métriques
                  </h4>
                  <div v-if="metricsHistory.length > 0">
                    <MetricsHistoryChart :history="metricsHistory" />
                  </div>
                  <div v-else class="h-64 flex items-center justify-center text-gray-400 text-sm">
                    Aucune donnée historique disponible
                  </div>
                </div>
              </div>
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
            <button @click="location.reload()" class="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
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

<script setup>
import { io } from 'socket.io-client'
import MetricsHistoryChart from './components/MetricsHistoryChart.vue'

const modules = ref([])
const selectedModuleId = ref('')
const deviceStatus = ref(null)
const sensorData = ref({ co2: [], temp: [], hum: [] })
const selectedGraphSensor = ref(null)
const showSystemInfo = ref(false)
const showHardwareInfo = ref(false)
const showConfig = ref(false)
const dbSize = ref(null)
const showMetricsHistory = ref(false)
const metricsHistory = ref([])

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

const formatSize = (kb) => {
  if (!kb && kb !== 0) return '--'
  if (kb < 1024) return kb + ' KB'
  if (kb < 1024 * 1024) return (kb / 1024).toFixed(1) + ' MB'
  return (kb / (1024 * 1024)).toFixed(2) + ' GB'
}

const formatBytes = (bytes) => {
  if (!bytes && bytes !== 0) return '--'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
}

const getFlashUsagePercent = () => {
  const total = deviceStatus.value?.hardware?.chip?.flash_kb
  const used = deviceStatus.value?.system?.flash?.used_kb
  if (!total || !used) return 0
  if (!total || !used) return 0
  return Math.round((used / total) * 100)
}

// Calculer l'uptime depuis uptime_start
const calculatedUptime = computed(() => {
  if (!deviceStatus.value?.system?.uptime_start) return null
  const now = Math.floor(Date.now() / 1000)
  const uptimeStart = deviceStatus.value.system.uptime_start
  // On stocke aussi le timestamp de réception pour calculer précisément
  if (!deviceStatus.value.system._config_received_at) {
    deviceStatus.value.system._config_received_at = now
    deviceStatus.value.system._uptime_start_offset = uptimeStart
  }
  // Calculer depuis le moment où on a reçu la config
  const elapsedSinceConfig = now - deviceStatus.value.system._config_received_at
  return deviceStatus.value.system._uptime_start_offset + elapsedSinceConfig
})

// Calculer le pourcentage de heap utilisé
const calculatedHeapUsedPercent = computed(() => {
  const total = deviceStatus.value?.system?.memory?.heap_total_kb
  const free = deviceStatus.value?.system?.memory?.heap_free_kb
  if (!total || free === undefined || free === null) return 0
  const used = total - free
  return (used / total) * 100
})

const getHeapColorClass = () => {
  const percent = calculatedHeapUsedPercent.value
  if (percent < 50) return 'bg-green-500'
  if (percent < 75) return 'bg-yellow-500'
  return 'bg-red-500'
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
  const unitMap = {
    co2: 'ppm',
    temperature: '°C',
    temp: '°C',
    humidity: '%',
    hum: '%',
    pm25: 'µg/m³',
    voc: 'ppb',
    pressure: 'hPa'
  }
  return unitMap[type] || ''
}

// Fusionne les données de capteur (status/value) avec la config (model) pour l'affichage
const getSensorData = (sensorName) => {
  const status = deviceStatus.value?.sensors?.[sensorName] || {}
  const config = deviceStatus.value?.sensorsConfig?.[sensorName] || {}
  return {
    ...status,
    ...(config.model && { model: config.model })
  }
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
    console.error("❌ Erreur fetch dashboard:", e)
  }
}

const isLoading = ref(true)
const error = ref(null)
let socket

watch(selectedModuleId, (newModuleId) => loadDashboard(newModuleId))

// Charger l'historique des métriques quand on affiche la section
watch(showMetricsHistory, (show) => {
  if (show && metricsHistory.value.length === 0) {
    const loadMetricsHistory = async () => {
      try {
        const data = await $fetch('/api/metrics-history?days=30')
        metricsHistory.value = data.history || []
      } catch (e) {
        console.error("Erreur fetch metrics-history:", e)
      }
    }
    loadMetricsHistory()
  }
})

onMounted(async () => {
  isLoading.value = true
  error.value = null
  
  // Lancer tous les appels en parallèle dès le chargement
  const promises = []
  
  // 1. Charger les modules
  promises.push(
    $fetch('/api/modules', { timeout: 5000, retry: 0 })
      .then(data => {
        modulesList.value = data
        modules.value = data
        if (modules.value.length > 0 && !selectedModuleId.value) {
          selectedModuleId.value = modules.value[0].id
        }
      })
      .catch(e => {
        console.error("Erreur fetch modules:", e)
        error.value = `Impossible de charger les modules: ${e.message || 'Erreur de connexion'}`
      })
  )
  
  // 2. Charger la taille de la base de données (non bloquant)
  promises.push(
    $fetch('/api/db-size', { timeout: 5000 })
      .then(dbSizeData => {
        dbSize.value = dbSizeData
      })
      .catch(e => {
        console.error("Erreur fetch db-size:", e)
      })
  )
  
  // 3. Initialiser WebSocket (non bloquant)
  const config = useRuntimeConfig()
  try {
    socket = io(config.public.socketUrl, { transports: ['websocket'], upgrade: false })
    
    socket.on('mqtt:data', (message) => {
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
  if (socket) socket.disconnect()
})
</script>
