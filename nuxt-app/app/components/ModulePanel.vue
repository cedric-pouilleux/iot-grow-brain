<template>
  <div class="bg-white rounded-xl shadow-sm border border-gray-100 transition-all mb-6">
    <!-- Loading state -->
    <div v-if="!deviceStatus" class="p-8 text-center text-gray-400">
      <div class="animate-spin w-8 h-8 border-2 border-gray-300 border-t-emerald-500 rounded-full mx-auto mb-4"></div>
      Chargement de {{ moduleName }}...
    </div>

    <template v-else>
      <!-- Header du Panel -->
      <div class="p-4 bg-gray-50 border-b border-gray-100">
        <div class="flex flex-wrap justify-between items-start gap-4">
          <div class="flex items-center gap-3">
            <div class="w-3 h-3 rounded-full" :class="isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'"></div>
            <div>
              <h2 class="font-bold text-lg text-gray-800">{{ moduleName }}</h2>
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
            
            <!-- RSSI / WiFi Icon (SVG Pure) -->
            <div class="relative group/rssi cursor-help p-1">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5" :class="rssiClass">
                <circle cx="12" cy="20" r="2" />
                <path d="M8.5 15.5c1.9-1.9 5.1-1.9 7 0" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none" v-if="rssiLevel >= 1" />
                <path d="M8.5 15.5c1.9-1.9 5.1-1.9 7 0" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.2" v-else />
                <path d="M5 12c3.9-3.9 10.1-3.9 14 0" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none" v-if="rssiLevel >= 2" />
                <path d="M5 12c3.9-3.9 10.1-3.9 14 0" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.2" v-else />
                <path d="M1.5 8.5c5.8-5.8 15.2-5.8 21 0" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none" v-if="rssiLevel >= 3" />
                <path d="M1.5 8.5c5.8-5.8 15.2-5.8 21 0" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.2" v-else />
              </svg>
              <div class="absolute top-full right-0 mt-1 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover/rssi:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
                Signal: {{ deviceStatus.system?.rssi || '--' }} dBm
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Grille des Capteurs -->
      <div class="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <SensorMiniCard v-for="type in sensorTypes" :key="type.key"
          :label="type.label" 
          :sensor="deviceStatus.sensors?.[type.key]" 
          :color="type.color"
          :history="getSensorHistory(type.key)"
          :is-graph-open="selectedGraphSensor === type.key"
          :module-id="moduleId"
          :sensor-key="type.key"
          :initial-interval="deviceStatus.sensorsConfig?.sensors?.[type.key]?.interval || 60"
          @toggle-graph="toggleGraph(type.key)"
        />
      </div>

      <!-- Grand Graphique Détaillé -->
      <div v-if="selectedGraphSensor" class="border-t border-gray-100 bg-gray-50 p-6 animate-fade-in">
          <div class="flex justify-between items-center mb-4">
            <h3 class="font-bold text-gray-700 uppercase text-sm flex items-center gap-2">
                <span class="w-2 h-2 rounded-full" :style="{ backgroundColor: getSensorColor(selectedGraphSensor) }"></span>
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
    </template>
  </div>
</template>

<script setup>
import { io } from 'socket.io-client'

const props = defineProps({
  moduleId: String,
  moduleName: String
})

const deviceStatus = ref(null)
const sensorData = ref({ co2: [], temp: [], hum: [] })
const selectedGraphSensor = ref(null)

const sensorTypes = [
  { key: 'co2', label: 'CO2', color: 'emerald' },
  { key: 'temperature', label: 'Température', color: 'orange' },
  { key: 'humidity', label: 'Humidité', color: 'blue' },
  { key: 'pm25', label: 'PM2.5', color: 'violet' },
  { key: 'voc', label: 'COV', color: 'pink' },
  { key: 'pressure', label: 'Pression', color: 'cyan' }
]

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

const rssiLevel = computed(() => {
  const rssi = deviceStatus.value?.system?.rssi || -99
  if (rssi > -60) return 3
  if (rssi > -75) return 2
  if (rssi > -85) return 1
  return 0
})

const toggleGraph = (sensorType) => {
  if (selectedGraphSensor.value === sensorType) {
    selectedGraphSensor.value = null
  } else {
    selectedGraphSensor.value = sensorType
  }
}

const getSensorLabel = (type) => {
  const found = sensorTypes.find(t => t.key === type)
  return found ? found.label : type
}

const getSensorColor = (type) => {
  const map = { co2: '#10b981', temperature: '#f97316', humidity: '#3b82f6', pm25: '#8b5cf6', voc: '#ec4899', pressure: '#06b6d4' }
  return map[type] || '#9ca3af'
}

const getSensorUnit = (type) => {
  return deviceStatus.value?.sensors?.[type]?.unit || ''
}

const getSensorHistory = (type) => {
  if (type === 'co2') return sensorData.value.co2
  if (type === 'temperature') return sensorData.value.temp
  if (type === 'humidity') return sensorData.value.hum
  return []
}

// --- Data Loading ---
const loadData = async () => {
  try {
    const dashboardData = await $fetch(`/api/dashboard?module=${props.moduleId}&days=1&_t=${Date.now()}`)
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
    console.error("Erreur fetch module:", props.moduleId, e)
  }
}

let socket
const config = useRuntimeConfig()

onMounted(() => {
  loadData()

  socket = io(config.public.socketUrl, { transports: ['websocket'], upgrade: false })
  socket.on('mqtt:data', (message) => {
      if (!message.topic.startsWith(props.moduleId)) return

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

