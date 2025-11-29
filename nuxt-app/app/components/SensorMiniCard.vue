<template>
  <div 
    class="relative rounded-lg transition-all group/card cursor-pointer hover:shadow-md" 
    :class="containerClass"
    @click="$emit('toggle-graph')"
  >
     
    <!-- Header: Label & Controls -->
    <div class="flex justify-between items-start mb-1 pt-2 pl-2 pr-2" @click.stop>
      <div class="text-xs text-gray-400">
        {{ label }}
      </div>
      
      <div class="flex items-center gap-1.5 z-20">
        <!-- Config Icon with Dropdown -->
        <div class="relative flex items-center">
          <button 
            @click="showConfigDropdown = !showConfigDropdown"
            class="text-gray-400 hover:text-gray-600 transition-colors flex items-center justify-center"
            title="Configuration"
          >
            <Icon name="ph:gear-bold" class="w-4 h-4" /> 
          </button>
          
          <!-- Dropdown Content -->
          <div 
            v-if="showConfigDropdown"
            class="absolute right-0 top-6 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50"
            @click.stop
          >
            <!-- Configuration Form -->
            <div class="min-w-[200px]">
              <h4 class="text-xs font-semibold text-gray-500 uppercase mb-3">Configuration</h4>
              
              <div class="space-y-3">
                <div class="space-y-1">
                  <div class="flex justify-between items-center">
                    <label class="text-xs font-medium text-gray-700">Intervalle</label>
                    <span class="text-xs text-gray-500">{{ localInterval }}s</span>
                  </div>
                  <input 
                    type="range" 
                    v-model.number="localInterval" 
                    min="10" 
                    max="300" 
                    step="10"
                    class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                <div class="flex justify-end pt-1">
                  <button 
                    @click="saveConfig"
                    :disabled="saving"
                    class="px-2 py-1 bg-blue-600 text-white text-[10px] font-medium rounded hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1"
                  >
                    <Icon v-if="saving" name="tabler:loader-2" class="w-3 h-3 animate-spin" />
                    {{ saving ? '...' : 'OK' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Status Pastille with Tooltip --> 
        <div 
          class="cursor-help group/status relative flex items-center justify-center"
        >
          <Icon 
            :name="isActive ? 'tabler:circle-check-filled' : 'tabler:circle-x-filled'" 
            :class="isActive ? 'w-4 h-4 text-green-500' : 'w-4 h-4 text-red-500'" 
          />
          <div class="absolute bottom-full right-0 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover/status:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
            Modèle: {{ sensor?.model || 'N/A' }} {{ sensor?.status === 'ok' ? 'ok' : '' }}
          </div>
        </div>
      </div>
    </div>
    
    <!-- Valeur & Last Refresh -->
    <div class="flex flex-col mb-2 relative z-10 pl-2 pr-2">
      <!-- Valeur Actuelle --> 
      <div class="text-3xl font-bold leading-none tracking-tight flex items-baseline gap-0.5" :class="valueClass">
        {{ formattedValue }}
        <span class="text-lg font-semibold opacity-80">{{ sensorUnit }}</span>
      </div>
      
      <!-- Dernier rafraîchissement -->
      <div class="flex items-center gap-1 text-[10px] text-gray-400 mt-1">
        <Icon name="ph:arrow-clockwise" class="w-3 h-3" />
        <span v-if="timeAgo">{{ timeAgo }}</span>
        <span v-else class="text-gray-300">--</span>
      </div>
    </div>

    <!-- Mini Graphique avec Chart.js -->
    <div class="h-24 w-full relative p-2" v-if="hasHistory">
      <ClientOnly> 
        <Line v-if="chartData" :data="chartData" :options="chartOptions" class="rounded-lg" />
        <template #fallback>
          <div class="h-full flex items-center justify-center text-[10px] text-gray-300">
            Chargement...
          </div>
        </template>
      </ClientOnly>
    </div>
    
    <div v-else class="h-24 flex items-center justify-center text-[10px] text-gray-300 border-t border-gray-100 mt-2">
      Pas d'historique
    </div>

  </div>
</template>

<script setup>
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  TimeScale,
  Filler
} from 'chart.js'
import { Line } from 'vue-chartjs'
import 'chartjs-adapter-date-fns'

// Enregistrer Chart.js uniquement côté client
if (process.client) {
  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    TimeScale,
    Filler
  )
}

const props = defineProps({
  label: String,
  sensor: Object,
  color: { type: String, default: 'gray' },
  history: { type: Array, default: () => [] },
  isGraphOpen: { type: Boolean, default: false },
  moduleId: { type: String, default: null },
  sensorKey: { type: String, default: null },
  initialInterval: { type: Number, default: 60 }
})

defineEmits(['toggle-graph'])

const showConfigDropdown = ref(false)
const now = ref(Date.now())
const localInterval = ref(props.initialInterval)
const saving = ref(false)

// Mettre à jour localInterval si la prop change, MAIS seulement si le menu n'est pas ouvert
watch(() => props.initialInterval, (val) => {
  if (!showConfigDropdown.value) {
    localInterval.value = val
  }
})

const saveConfig = async () => {
  if (!props.moduleId || !props.sensorKey) return
  
  saving.value = true
  try {
    // On doit récupérer la config existante complète pour ne pas écraser les autres capteurs
    // Mais l'API attend un objet partiel et fait un merge ? 
    // Vérifions l'API : existingData.sensorsConfig = config; -> CA ECRASE TOUT !
    // Aïe. L'API backend écrase sensorsConfig avec ce qu'on envoie.
    // Il faut que je modifie l'API pour faire un merge profond ou que j'envoie tout.
    // OU je modifie l'API pour accepter un patch partiel.
    
    // Pour l'instant, supposons que je doive modifier l'API pour faire un merge.
    // Je vais envoyer juste ce capteur et modifier l'API.
    
    const payload = {
      sensors: {
        [props.sensorKey]: { interval: localInterval.value }
      }
    }
    
    await $fetch(`/api/modules/${encodeURIComponent(props.moduleId)}/config`, {
      method: 'POST',
      body: payload
    })
    
    showConfigDropdown.value = false
  } catch (err) {
    console.error('Erreur sauvegarde config:', err)
    alert('Erreur lors de la sauvegarde')
  } finally {
    saving.value = false
  }
}

// Fermer le dropdown si on clique en dehors
const handleClickOutside = (event) => {
  const target = event.target
  if (!target.closest('.relative')) {
    showConfigDropdown.value = false
  }
}

// Mettre à jour le temps en temps réel (toutes les secondes)
let interval
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  interval = setInterval(() => {
    now.value = Date.now() 
  }, 1000) // Mise à jour chaque seconde
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  if (interval) clearInterval(interval)
})

const colorMap = {
  emerald: { text: 'text-emerald-600', stroke: '#10b981' },
  orange: { text: 'text-orange-500', stroke: '#f97316' },
  blue: { text: 'text-blue-500', stroke: '#3b82f6' },
  violet: { text: 'text-violet-500', stroke: '#8b5cf6' },
  pink: { text: 'text-pink-500', stroke: '#ec4899' },
  cyan: { text: 'text-cyan-500', stroke: '#06b6d4' },
  gray: { text: 'text-gray-400', stroke: '#9ca3af' }
}

const colors = computed(() => colorMap[props.color] || colorMap.gray)
// Une carte est active si elle a un status 'ok' OU si elle a une valeur (même sans status défini)
const isActive = computed(() => {
  if (props.sensor?.status === 'ok') return true
  if (props.sensor?.status === 'missing') return false
  // Si pas de status mais qu'on a une valeur, on considère que c'est actif
  return props.sensor?.value !== null && props.sensor?.value !== undefined
})
const isMissing = computed(() => !props.sensor || props.sensor.status === 'missing')
const hasHistory = computed(() => props.history && props.history.length >= 2)

const containerClass = computed(() => 'bg-white border border-gray-100 shadow-sm hover:shadow-md')
const valueClass = computed(() => isActive.value ? colors.value.text : 'text-gray-300')
const strokeColor = computed(() => isActive.value ? colors.value.stroke : '#d1d5db')

const formattedValue = computed(() => formatVal(props.sensor?.value))

const sensorUnit = computed(() => {
  const unitMap = {
    'CO2': 'ppm',
    'Température': '°C',
    'Humidité': '%',
    'PM2.5': 'µg/m³',
    'COV': 'ppb',
    'Pression': 'hPa'
  }
  return unitMap[props.label] || ''
})

const timeAgo = computed(() => {
  // Utiliser now.value pour déclencher la réactivité
  const current = now.value
  
  // Si pas d'historique, ne rien afficher (pas "Jamais mis à jour")
  if (!props.history || props.history.length === 0) return ''
  
  const lastData = props.history[props.history.length - 1]
  const lastTime = new Date(lastData.time).getTime()
  const diffSeconds = Math.floor((current - lastTime) / 1000)
  
  if (diffSeconds < 5) return 'À l\'instant'
  if (diffSeconds < 60) return `Il y a ${diffSeconds}s`
  const minutes = Math.floor(diffSeconds / 60)
  if (minutes < 60) return `Il y a ${minutes}min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Il y a ${hours}h`
  return formatTime(lastData.time, false)
})

const formatVal = (val) => {
  if (val === null || val === undefined) return '--'
  const num = parseFloat(val)
  if (Number.isInteger(num)) return num.toString()
  return num.toFixed(1).replace(/\.0$/, '')
}

const formatTime = (dateObj, full = false) => {
  if (!dateObj) return ''
  const d = new Date(dateObj)
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  if (full) {
      const s = d.getSeconds().toString().padStart(2, '0')
      return `${h}:${m}:${s}`
  }
  return `${h}:${m}`
}

const graphMinMax = computed(() => {
  if (!hasHistory.value) return { min: 0, max: 100 }
  const values = props.history.map(d => d.value).filter(v => v !== null)
  if (values.length === 0) return { min: 0, max: 100 }
  let min = Math.min(...values)
  let max = Math.max(...values)
  
  // Petit padding pour ne pas coller aux bords
  const range = max - min || 1
  return { 
    min: min - (range * 0.1), 
    max: max + (range * 0.1) 
  }
})

// Configuration Chart.js pour le sparkline
const chartData = computed(() => {
  if (!hasHistory.value) return null
  
  // Trier les données par temps croissant (comme le grand graphique)
  const sortedData = [...props.history].sort((a, b) => {
    const timeA = a.time instanceof Date ? a.time.getTime() : new Date(a.time).getTime()
    const timeB = b.time instanceof Date ? b.time.getTime() : new Date(b.time).getTime()
    return timeA - timeB
  })
  
  // Convertir la couleur hex en rgba pour le fill
  const hexToRgba = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }
  
  return {
    datasets: [
      {
        label: props.label,
        backgroundColor: hexToRgba(strokeColor.value, 0.2),
        borderColor: strokeColor.value,
        borderWidth: 2,
        data: sortedData.map(m => ({ x: m.time, y: m.value })),
        tension: 0.2,
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 0,
        spanGaps: true
      }
    ]
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { intersect: false },
  scales: {
    x: {
      type: 'time',
      display: false, // Masquer l'axe X pour un sparkline
      time: {
        unit: 'minute'
      }
    },
    y: {
      display: false, // Masquer l'axe Y pour un sparkline
      min: graphMinMax.value.min,
      max: graphMinMax.value.max
    }
  },
  plugins: {
    legend: { display: false },
    tooltip: { enabled: false } // Désactiver le tooltip pour un sparkline
  }
}))
</script>
