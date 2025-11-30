<template>
  <div class="border-t border-gray-100 bg-gray-50">
    <button 
      @click="isOpen = !isOpen"
      class="w-full p-4 flex items-center justify-between hover:bg-gray-100 transition-colors"
    >
      <div class="flex items-center gap-3">
        <Icon name="tabler:device-desktop" class="w-5 h-5 text-gray-600" />
        <h3 class="font-semibold text-gray-700">Informations Système</h3>
      </div>
      <Icon 
        :name="isOpen ? 'tabler:chevron-up' : 'tabler:chevron-down'" 
        class="w-5 h-5 text-gray-400"
      />
    </button>
    
    <div v-if="isOpen" class="p-4 bg-white border-t border-gray-100">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <SystemInfoCard title="Réseau" icon="tabler:network">
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
        </SystemInfoCard>

        <SystemInfoCard title="Processeur" icon="tabler:cpu">
          <div class="flex justify-between">
            <span class="text-gray-600">Modèle</span>
            <span class="font-mono text-gray-800 text-xs">
              {{ deviceStatus?.hardware?.chip?.model || deviceStatus?.system?.chip?.model || '--' }}
            </span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Révision</span>
            <span class="font-mono text-gray-800">
              {{ deviceStatus?.hardware?.chip?.rev || deviceStatus?.system?.chip?.rev || '--' }}
            </span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Fréquence</span>
            <span class="font-mono text-gray-800">
              {{ deviceStatus?.hardware?.chip?.cpuFreqMhz || deviceStatus?.system?.chip?.cpuFreqMhz || '--' }} MHz
            </span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Uptime</span>
            <span class="font-mono text-gray-800">{{ formatUptime(calculatedUptime) }}</span>
          </div>
        </SystemInfoCard>

        <SystemInfoCard title="Mémoire Flash" icon="tabler:database">
          <div class="flex justify-between">
            <span class="text-gray-600">Totale</span>
            <span class="font-mono text-gray-800">
              {{ deviceStatus?.hardware?.chip?.flashKb ? formatSize(deviceStatus.hardware.chip.flashKb) : '--' }}
            </span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Sketch (code)</span>
            <span class="font-mono text-gray-800">
              {{ deviceStatus?.system?.flash?.usedKb ? formatSize(deviceStatus.system.flash.usedKb) : '--' }}
            </span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Libre (OTA)</span>
            <span class="font-mono text-gray-800">
              {{ deviceStatus?.system?.flash?.freeKb ? formatSize(deviceStatus.system.flash.freeKb) : '--' }}
            </span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Partitions système</span>
            <span class="font-mono text-gray-800">
              {{ deviceStatus?.system?.flash?.systemKb ? formatSize(deviceStatus.system.flash.systemKb) : '--' }}
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
        </SystemInfoCard>

        <SystemInfoCard title="Mémoire RAM" icon="tabler:memory">
          <div class="flex justify-between">
            <span class="text-gray-600">Totale</span>
            <span class="font-mono text-gray-800">
              {{ deviceStatus?.system?.memory?.heapTotalKb ? formatSize(deviceStatus.system.memory.heapTotalKb) : '--' }}
            </span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Libre</span>
            <span class="font-mono text-gray-800">{{ formatSize(deviceStatus.system?.memory?.heapFreeKb) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Min. libre</span>
            <span class="font-mono text-gray-800">{{ formatSize(deviceStatus.system?.memory?.heapMinFreeKb) }}</span>
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
        </SystemInfoCard>

        <SystemInfoCard 
          v-if="deviceStatus?.system?.memory?.psram" 
          title="PSRAM" 
          icon="tabler:memory-stick"
        >
          <div class="flex justify-between">
            <span class="text-gray-600">Totale</span>
            <span class="font-mono text-gray-800">{{ formatSize(deviceStatus?.system?.memory?.psram?.total_kb) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Libre</span>
            <span class="font-mono text-gray-800">{{ formatSize(deviceStatus?.system?.memory?.psram?.freeKb) }}</span>
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
        </SystemInfoCard>

        <SystemInfoCard title="Base de données" icon="tabler:database">
          <div class="flex justify-between">
            <span class="text-gray-600">Taille totale</span>
            <span class="font-mono text-gray-800">{{ dbSize ? formatBytes(dbSize.totalSizeBytes) : '--' }}</span>
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
        </SystemInfoCard>
      </div>

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
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import SystemInfoCard from './SystemInfoCard.vue'
import MetricsHistoryChart from './MetricsHistoryChart.vue'

const props = defineProps({
  deviceStatus: { type: Object, default: null },
  dbSize: { type: Object, default: null },
  metricsHistory: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:metricsHistory'])

const isOpen = ref(false)
const showMetricsHistory = ref(false)

// Charger l'historique des métriques quand on affiche la section
watch(showMetricsHistory, (show) => {
  if (show && props.metricsHistory.length === 0) {
    loadMetricsHistory()
  }
})

const loadMetricsHistory = async () => {
  try {
    const data = await $fetch('/api/metrics-history?days=30')
    // Émettre un événement pour mettre à jour metricsHistory dans le parent
    emit('update:metricsHistory', data.history || [])
  } catch (e) {
    console.error("Erreur fetch metrics-history:", e)
  }
}

const formatUptime = (seconds) => {
  if (!seconds && seconds !== 0) return '--'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}h ${m}m`
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

const calculatedUptime = computed(() => {
  if (!props.deviceStatus?.system?.uptimeStart) return null
  const now = Math.floor(Date.now() / 1000)
  const uptimeStart = props.deviceStatus.system.uptimeStart
  if (!props.deviceStatus.system._configReceivedAt) {
    props.deviceStatus.system._configReceivedAt = now
    props.deviceStatus.system._uptimeStartOffset = uptimeStart
  }
  const elapsedSinceConfig = now - props.deviceStatus.system._configReceivedAt
  return props.deviceStatus.system._uptimeStartOffset + elapsedSinceConfig
})

const calculatedHeapUsedPercent = computed(() => {
  const total = props.deviceStatus?.system?.memory?.heapTotalKb
  const free = props.deviceStatus?.system?.memory?.heapFreeKb
  if (!total || free === undefined || free === null) return 0
  const used = total - free
  return (used / total) * 100
})

const getFlashUsagePercent = () => {
  const total = props.deviceStatus?.hardware?.chip?.flashKb
  const used = props.deviceStatus?.system?.flash?.usedKb
  if (!total || !used) return 0
  return Math.round((used / total) * 100)
}

const getHeapColorClass = () => {
  const percent = calculatedHeapUsedPercent.value
  if (percent < 50) return 'bg-green-500'
  if (percent < 75) return 'bg-yellow-500'
  return 'bg-red-500'
}
</script>

