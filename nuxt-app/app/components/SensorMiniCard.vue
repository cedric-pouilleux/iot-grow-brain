<template>
  <div class="relative p-3 rounded-lg transition-all group/card" :class="containerClass">
    
    <!-- Header: Label & Info Icon -->
    <div class="flex justify-between items-start mb-1">
      <div class="text-xs font-bold uppercase text-gray-500">{{ label }}</div>
      
      <div class="flex items-center gap-2 z-20">
        <!-- Graph Icon Button -->
        <button 
          @click="$emit('toggle-graph')"
          class="text-gray-400 hover:text-emerald-600 transition-colors flex items-center"
          :class="{ 'text-emerald-600': isGraphOpen }"
          title="Voir le graphique détaillé"
        >
          <Icon name="ph:chart-line-up-bold" class="w-4 h-4" /> 
        </button>

        <!-- Info Icon with Tooltip -->
        <div class="relative group/info flex items-center">
          <button class="text-gray-400 hover:text-gray-600 flex items-center">
            <Icon name="ph:info-bold" class="w-4 h-4" />
          </button>
          
          <!-- Tooltip Content -->
          <div class="absolute right-0 top-6 w-56 bg-gray-800 text-white text-xs rounded-md shadow-lg p-3 opacity-0 group-hover/info:opacity-100 transition-opacity pointer-events-none flex flex-col gap-2 z-50">
            <div class="flex justify-between items-center">
              <span class="text-gray-400">Modèle</span>
              <span class="font-mono">{{ sensor?.model || 'N/A' }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-400">État</span>
              <div class="flex items-center gap-1">
                <div class="w-2 h-2 rounded-full" :class="isActive ? 'bg-green-500' : 'bg-red-500'"></div>
                <span class="text-[10px] text-gray-500 capitalize">{{ sensor?.status || 'missing' }}</span>
              </div>
            </div>
            <div class="text-gray-400 text-[10px] text-right pt-1 border-t border-gray-700 italic">
              {{ timeAgo }}
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Valeur & Min/Max -->
    <div class="flex items-end justify-between mb-2 relative z-10">
      <!-- Valeur Actuelle -->
      <div class="text-3xl font-bold leading-none tracking-tight flex items-baseline gap-0.5" :class="valueClass">
        {{ formattedValue }}
        <span class="text-lg font-semibold opacity-80">{{ sensor?.unit || '' }}</span>
      </div>

      <!-- Min/Max (si historique) -->
      <div v-if="hasHistory" class="flex flex-col text-[10px] text-gray-400 font-mono leading-tight text-right pb-0.5">
        <div class="flex items-center justify-end gap-0.5">
          <Icon name="ph:caret-up-fill" class="w-2 h-2 text-gray-300" />
          {{ Math.round(graphMinMax.max) }}
        </div>
        <div class="flex items-center justify-end gap-0.5">
          <Icon name="ph:caret-down-fill" class="w-2 h-2 text-gray-300" />
          {{ Math.round(graphMinMax.min) }}
        </div>
      </div>
    </div>

    <!-- Mini Graphique Épuré -->
    <div class="h-24 w-full relative pt-2 pb-1" v-if="hasHistory">
      <svg class="w-full h-full overflow-visible" preserveAspectRatio="none">
        <!-- Zone de dessin plein cadre -->
        <svg x="0" y="0" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
           <!-- Ligne -->
           <polyline
            :points="sparklinePoints"
            fill="none"
            :stroke="strokeColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="transition-all duration-300"
          />
        </svg>
      </svg>
    </div>
    
    <div v-else class="h-24 flex items-center justify-center text-[10px] text-gray-300 border-t border-gray-100 mt-2">
      Pas d'historique
    </div>

  </div>
</template>

<script setup>
const props = defineProps({
  label: String,
  sensor: Object,
  color: { type: String, default: 'gray' },
  history: { type: Array, default: () => [] },
  isGraphOpen: { type: Boolean, default: false }
})

defineEmits(['toggle-graph'])

const now = ref(Date.now())

// Mettre à jour "now" toutes les secondes pour le timeAgo
let interval
onMounted(() => {
  interval = setInterval(() => {
    now.value = Date.now()
  }, 5000)
})
onUnmounted(() => clearInterval(interval))

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
const isActive = computed(() => props.sensor?.status === 'ok')
const isMissing = computed(() => !props.sensor || props.sensor.status === 'missing')
const hasHistory = computed(() => props.history && props.history.length >= 2)

const containerClass = computed(() => isMissing.value ? 'bg-gray-50 opacity-60' : 'bg-white border border-gray-100 shadow-sm hover:shadow-md')
const valueClass = computed(() => isActive.value ? colors.value.text : 'text-gray-300')
const strokeColor = computed(() => isActive.value ? colors.value.stroke : '#d1d5db')

const formattedValue = computed(() => formatVal(props.sensor?.value))

const timeAgo = computed(() => {
  if (!props.history || props.history.length === 0) return 'Jamais mis à jour'
  
  const lastData = props.history[props.history.length - 1]
  const lastTime = new Date(lastData.time).getTime()
  const diffSeconds = Math.floor((now.value - lastTime) / 1000)
  
  if (diffSeconds < 5) return 'À l\'instant'
  if (diffSeconds < 60) return `Rafraîchi il y a ${diffSeconds} sec`
  const minutes = Math.floor(diffSeconds / 60)
  if (minutes < 60) return `Rafraîchi il y a ${minutes} min`
  return `Dernière màj: ${formatTime(lastData.time, true)}`
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

// Calcul des points normalisés pour SVG (0-100)
const normalizedPoints = computed(() => {
  if (!hasHistory.value) return []
  const data = props.history
  const { min, max } = graphMinMax.value
  const range = max - min || 1
  
  return data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100
    const y = 100 - ((d.value - min) / range) * 100
    return { x, y }
  })
})

const sparklinePoints = computed(() => {
  return normalizedPoints.value.map(p => `${p.x},${p.y}`).join(' ')
})
</script>
