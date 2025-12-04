<template>
  <div class="h-screen flex bg-gray-100">
    <!-- Filters Sidebar (Left) -->
    <div class="w-80 bg-white border-r border-gray-200 p-4 overflow-y-auto flex-shrink-0 flex flex-col">
      <!-- Period -->
      <div class="mb-4">
        <label class="block text-sm text-gray-700 mb-2">Période</label>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="period in periods"
            :key="period.value"
            @click="timeRange = period.value"
            :class="[
              'px-2.5 py-1 rounded text-xs transition-all',
              timeRange === period.value
                ? 'bg-gray-700 text-white shadow'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            ]"
          >
            {{ period.label }}
          </button>
        </div>
      </div>

      <!-- Category -->
      <div class="mb-4">
        <label class="block text-sm text-gray-700 mb-2">Catégorie</label>
        <div class="flex flex-wrap gap-1.5">
          <button
            @click="toggleCategory('')"
            :class="[
              'px-2.5 py-1 rounded text-xs transition-all',
              filters.categories.length === 0
                ? 'bg-gray-700 text-white shadow'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            ]"
          >
            Toutes
          </button>
          <button
            v-for="cat in categories"
            :key="cat.value"
            @click="toggleCategory(cat.value)"
            :class="[
              'px-2.5 py-1 rounded text-xs transition-all flex items-center gap-1.5',
              filters.categories.includes(cat.value)
                ? 'text-white shadow'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            ]"
            :style="filters.categories.includes(cat.value) ? { backgroundColor: cat.color } : {}"
          >
            <div 
              class="w-2 h-2 rounded-full" 
              :style="{ backgroundColor: filters.categories.includes(cat.value) ? 'white' : cat.color }"
            ></div>
            {{ cat.label }}
          </button>
        </div>
      </div>

      <!-- Level -->
      <div class="mb-4">
        <label class="block text-sm text-gray-700 mb-2">Niveau</label>
        <div class="flex flex-wrap gap-1.5">
          <button
            @click="toggleLevel('')"
            :class="[
              'px-2.5 py-1 rounded text-xs transition-all',
              filters.levels.length === 0
                ? 'bg-gray-700 text-white shadow'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            ]"
          >
            Tous
          </button>
          <button
            v-for="lvl in levels"
            :key="lvl.value"
            @click="toggleLevel(lvl.value)"
            :class="[
              'px-2.5 py-1 rounded text-xs transition-all',
              filters.levels.includes(lvl.value)
                ? 'text-white shadow'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            ]"
            :style="filters.levels.includes(lvl.value) ? { backgroundColor: lvl.color } : {}"
          >
            {{ lvl.label }}
          </button>
        </div>
      </div>

      <!-- Search -->
      <div class="mb-4">
        <label class="block text-sm text-gray-700 mb-2">Recherche</label>
        <input
          v-model="filters.search"
          type="text"
          placeholder="Mots-clés..."
          class="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
        />
      </div>

      <!-- Limit -->
      <div class="mb-4">
        <label class="block text-sm text-gray-700 mb-2">Limite</label>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="lim in limits"
            :key="lim"
            @click="filters.limit = String(lim)"
            :class="[
              'px-2.5 py-1 rounded text-xs transition-all',
              filters.limit === String(lim)
                ? 'bg-gray-700 text-white shadow'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            ]"
          >
            {{ lim }}
          </button>
        </div>
      </div>

      <!-- Spacer to push delete button to bottom -->
      <div class="flex-1"></div>

      <!-- Delete Button -->
      <div class="flex justify-end pt-4 border-t border-gray-200">
        <button
          class="px-2 py-1 text-xs text-red-600 border border-red-300 rounded hover:border-red-400 hover:bg-red-50 transition-colors flex items-center gap-1"
          @click="confirmDeleteAll"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          Vider les logs
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Histogram -->
      <div class="flex-shrink-0">
        <LogHistogram
          :range="currentRange"
          :filters="{
            category: filters.categories.join(','),
            level: filters.levels.join(','),
            search: filters.search
          }"
          :selection="timeSelection"
          @update:selection="handleSelectionUpdate"
        />
      </div>

      <!-- Logs Table -->
      <div class="flex-1 overflow-auto bg-white">
        <div v-if="loading" class="p-8 text-center">
          <div
            class="animate-spin w-8 h-8 border-2 border-gray-300 border-t-emerald-500 rounded-full mx-auto mb-4"
          ></div>
          <p class="text-gray-500">Chargement des logs...</p>
        </div>

        <div v-else-if="error" class="p-8 text-center text-red-600">
          <p>{{ error }}</p>
          <button
            class="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            @click="loadLogs"
          >
            Réessayer
          </button>
        </div>

        <div v-else-if="logs.length === 0" class="p-8 text-center text-gray-500">
          Aucun log trouvé
        </div>

        <div v-else class="h-full flex flex-col">
          <div class="flex-1 overflow-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50 sticky top-0 z-20">
                <tr>
                  <th class="px-3 py-2 text-left text-xs font-medium text-gray-500">Heure</th>
                  <th class="px-3 py-2 text-left text-xs font-medium text-gray-500">Catégorie</th>
                  <th class="px-3 py-2 text-left text-xs font-medium text-gray-500">Niveau</th>
                  <th class="px-3 py-2 text-left text-xs font-medium text-gray-500">Message</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr
                  v-for="log in logs"
                  :key="log.id"
                  class="hover:bg-gray-50 transition-colors"
                >
                  <td class="px-3 py-1 whitespace-nowrap text-xs text-gray-500">
                    {{ formatTime(log.time) }}
                  </td>
                  <td class="px-3 py-1 whitespace-nowrap">
                    <span
                      :class="getCategoryClass(log.category)"
                      class="px-1.5 py-0.5 text-xs font-medium"
                    >
                      {{ formatCategory(log.category) }}
                    </span>
                  </td>
                  <td class="px-3 py-1 whitespace-nowrap">
                    <span
                      :class="getLevelClass(log.level)"
                      class="px-1.5 py-0.5 text-xs font-medium"
                    >
                      {{ log.level }}
                    </span>
                  </td>
                  <td
                    class="px-3 py-1 text-xs text-gray-900 relative group"
                    :title="getTooltipText(log)"
                  >
                    <span class="cursor-help">{{ log.msg }}</span>
                    <div
                      v-if="log.details && Object.keys(log.details).length > 0"
                      class="absolute left-0 top-full mt-1 hidden group-hover:block z-50 bg-gray-900 text-white text-xs rounded px-3 py-2 max-w-md shadow-lg"
                    >
                      <pre class="whitespace-pre-wrap">{{ formatDetails(log.details) }}</pre>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div class="flex-shrink-0 bg-gray-50 px-3 py-1.5 flex items-center justify-between border-t border-gray-200 sticky bottom-0 z-20">
            <div class="text-xs text-gray-700">
              {{ offset + 1 }}-{{ Math.min(offset + logs.length, total) }} / {{ total }}
            </div>
            <div class="flex gap-2">
              <button
                :disabled="offset === 0"
                :class="{ 'opacity-50 cursor-not-allowed': offset === 0 }"
                class="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
                @click="previousPage"
              >
                ←
              </button>
              <button
                :disabled="offset + logs.length >= total"
                :class="{ 'opacity-50 cursor-not-allowed': offset + logs.length >= total }"
                class="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
                @click="nextPage"
              >
                →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>


    <!-- Delete Confirmation Modal -->
    <div
      v-if="showDeleteConfirm"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      @click="showDeleteConfirm = false"
    >
      <div class="bg-white rounded-lg p-6 max-w-md w-full" @click.stop>
        <h3 class="text-lg font-semibold mb-4 text-red-600">Confirmer la suppression</h3>
        <p class="text-gray-700 mb-6">
          Êtes-vous sûr de vouloir supprimer tous les logs ? Cette action est irréversible.
          <span class="font-semibold"> {{ total }} logs</span> seront supprimés.
        </p>
        <div class="flex gap-3 justify-end">
          <button
            class="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
            @click="showDeleteConfirm = false"
          >
            Annuler
          </button>
          <button
            :disabled="deleting"
            class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            @click="deleteAllLogs"
          >
            {{ deleting ? 'Suppression...' : 'Supprimer' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface LogEntry {
  id: string
  category: string
  level: string
  msg: string
  time: string
  details: Record<string, unknown> | null
}

interface LogsResponse {
  logs: LogEntry[]
  total: number
  limit: number
  offset: number
}

const logs = ref<LogEntry[]>([])
const total = ref(0)
const offset = ref(0)
const loading = ref(false)
const error = ref<string | null>(null)
const showDeleteConfirm = ref(false)
const deleting = ref(false)
const timeRange = ref('24h')
const timeSelection = ref<{ start: string; end: string } | null>(null)

const filters = ref({
  categories: [] as string[],
  levels: [] as string[],
  search: '',
  limit: '100',
})

const toggleCategory = (value: string) => {
  if (value === '') {
    filters.value.categories = []
  } else {
    const index = filters.value.categories.indexOf(value)
    if (index > -1) {
      filters.value.categories.splice(index, 1)
    } else {
      filters.value.categories.push(value)
    }
  }
}

const toggleLevel = (value: string) => {
  if (value === '') {
    filters.value.levels = []
  } else {
    const index = filters.value.levels.indexOf(value)
    if (index > -1) {
      filters.value.levels.splice(index, 1)
    } else {
      filters.value.levels.push(value)
    }
  }
}

const categories = [
  { value: 'ESP32', label: 'ESP32', color: '#4f46e5' },
  { value: 'MQTT', label: 'MQTT', color: '#ea580c' },
  { value: 'DB', label: 'DB', color: '#0891b2' },
  { value: 'API', label: 'API', color: '#db2777' },
  { value: 'SYSTEM', label: 'System', color: '#475569' },
  { value: 'WEBSOCKET', label: 'WebSocket', color: '#fb923c' },
]

const periods = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7 jours' },
]

const levels = [
  { value: 'trace', label: 'Trace', color: '#6b7280' },
  { value: 'debug', label: 'Debug', color: '#3b82f6' },
  { value: 'success', label: 'Success', color: '#22c55e' },
  { value: 'info', label: 'Info', color: '#10b981' },
  { value: 'warn', label: 'Warn', color: '#f59e0b' },
  { value: 'error', label: 'Error', color: '#ef4444' },
  { value: 'fatal', label: 'Fatal', color: '#a855f7' },
]

const limits = [50, 100, 200, 500]

const currentRange = computed(() => {
  const end = new Date()
  const start = new Date()
  
  if (timeRange.value === '24h') {
    start.setHours(start.getHours() - 24)
  } else if (timeRange.value === '7d') {
    start.setDate(start.getDate() - 7)
  }
  
  return {
    start: start.toISOString(),
    end: end.toISOString()
  }
})

const loadLogs = async () => {
  loading.value = true
  error.value = null

  try {
    const params = new URLSearchParams({
      limit: filters.value.limit,
      offset: String(offset.value),
    })

    // Add multiple categories
    filters.value.categories.forEach(cat => {
      params.append('category', cat)
    })
    
    // Add multiple levels
    filters.value.levels.forEach(lvl => {
      params.append('level', lvl)
    })
    
    if (filters.value.search) params.append('search', filters.value.search)
    
    // Apply time selection if exists
    if (timeSelection.value) {
      params.append('startDate', timeSelection.value.start)
      params.append('endDate', timeSelection.value.end)
    } else {
      // Otherwise use the time range
      params.append('startDate', currentRange.value.start)
      params.append('endDate', currentRange.value.end)
    }

    const response = await fetch(`/api/logs?${params}`)
    if (!response.ok) {
      throw new Error('Failed to load logs')
    }

    const data: LogsResponse = await response.json()
    logs.value = data.logs
    total.value = data.total
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unknown error'
  } finally {
    loading.value = false
  }
}

const nextPage = () => {
  offset.value += Number(filters.value.limit)
  loadLogs()
}

const previousPage = () => {
  offset.value = Math.max(0, offset.value - Number(filters.value.limit))
  loadLogs()
}

const formatTime = (time: string) => {
  const date = new Date(time)
  return date.toLocaleString('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }) + '.' + date.getMilliseconds().toString().padStart(3, '0')
}

const formatDetails = (details: Record<string, unknown>) => {
  return JSON.stringify(details, null, 2)
}

const getTooltipText = (log: LogEntry) => {
  if (log.details && Object.keys(log.details).length > 0) {
    return 'Survolez pour voir les détails'
  }
  return ''
}

const formatCategory = (category: string) => {
  if (category === 'ESP32') return 'ESP32'
  if (category === 'MQTT') return 'MQTT'
  if (category === 'DB') return 'DB'
  if (category === 'API') return 'API'
  if (category === 'SYSTEM') return 'System'
  if (category === 'WEBSOCKET') return 'WebSocket'
  return category.charAt(0) + category.slice(1).toLowerCase()
}

const getLevelClass = (level: string) => {
  const classes = {
    trace: 'text-gray-500',
    debug: 'text-blue-500',
    success: 'text-green-500 font-semibold',
    info: 'text-emerald-500',
    warn: 'text-amber-500',
    error: 'text-red-500',
    fatal: 'text-purple-500',
  }
  return classes[level as keyof typeof classes] || 'text-gray-500'
}

const getCategoryClass = (category: string) => {
  const classes = {
    ESP32: 'text-indigo-600',
    MQTT: 'text-orange-600',
    DB: 'text-cyan-600',
    API: 'text-pink-600',
    SYSTEM: 'text-slate-600',
    WEBSOCKET: 'text-orange-400',
  }
  return classes[category as keyof typeof classes] || 'text-gray-500'
}

const confirmDeleteAll = () => {
  if (total.value === 0) {
    alert('Aucun log à supprimer')
    return
  }
  showDeleteConfirm.value = true
}

const deleteAllLogs = async () => {
  deleting.value = true
  error.value = null

  try {
    const response = await fetch('/api/logs', {
      method: 'DELETE',
    })

    if (!response.ok) {
      throw new Error('Failed to delete logs')
    }

    const data = await response.json()
    showDeleteConfirm.value = false

    offset.value = 0
    await loadLogs()

    alert(`✅ ${data.message}`)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unknown error'
    alert('❌ Erreur lors de la suppression: ' + error.value)
  } finally {
    deleting.value = false
  }
}

const handleSelectionUpdate = (selection: { start: string; end: string } | null) => {
  timeSelection.value = selection
  offset.value = 0
  loadLogs()
}

watch(timeRange, () => {
  timeSelection.value = null
  offset.value = 0
  loadLogs()
})

watch(() => [filters.value.categories, filters.value.levels, filters.value.limit], () => {
  offset.value = 0
  loadLogs()
}, { deep: true })

// Debounce search
let searchDebounce: NodeJS.Timeout | null = null
watch(() => filters.value.search, () => {
  if (searchDebounce) clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => {
    offset.value = 0
    loadLogs()
  }, 300)
})

onMounted(() => {
  loadLogs()
})
</script>
