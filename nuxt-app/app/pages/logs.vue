<template>
  <div class="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100 flex flex-col">
    <!-- Sticky Header (Histogram + Filters) -->
    <div class="sticky top-0 z-30 bg-gray-100/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 shadow-sm transition-colors">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 space-y-2">
        
        <!-- Histogram -->
        <div class="w-full">
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

        <!-- Filters Row (Compact) -->
        <div class="flex flex-wrap items-center gap-2 pb-2">
          
          <!-- Period Dropdown -->
          <AppDropdown
            id="period-filter"
            dropdown-class="top-full left-0 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-xl mt-1 overflow-hidden border border-gray-200 dark:border-gray-700"
          >
            <template #trigger="{ isOpen }">
              <button
                class="px-2.5 py-1.5 text-xs font-medium rounded border transition-colors flex items-center gap-1.5"
                :class="isOpen 
                  ? 'bg-gray-800 dark:bg-gray-700 text-white border-gray-800 dark:border-gray-600' 
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'"
              >
                <Icon name="tabler:clock" class="w-3.5 h-3.5" />
                {{ periods.find(p => p.value === timeRange)?.label || 'Période' }}
                <Icon name="tabler:chevron-down" class="w-3 h-3" />
              </button>
            </template>
            <template #content="{ close }">
              <div class="py-1">
                <button
                  v-for="period in periods"
                  :key="period.value"
                  @click="timeRange = period.value; close()"
                  class="w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center justify-between"
                  :class="timeRange === period.value 
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-medium' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'"
                >
                  {{ period.label }}
                  <Icon v-if="timeRange === period.value" name="tabler:check" class="w-3.5 h-3.5 text-emerald-500" />
                </button>
              </div>
            </template>
          </AppDropdown>

          <!-- Category Dropdown (Multi-select) -->
          <AppDropdown
            id="category-filter"
            dropdown-class="top-full left-0 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl mt-1 overflow-hidden border border-gray-200 dark:border-gray-700"
          >
            <template #trigger="{ isOpen }">
              <button
                class="px-2.5 py-1.5 text-xs font-medium rounded border transition-colors flex items-center gap-1.5"
                :class="isOpen || filters.categories.length > 0
                  ? 'bg-gray-800 dark:bg-gray-700 text-white border-gray-800 dark:border-gray-600' 
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'"
              >
                <Icon name="tabler:category" class="w-3.5 h-3.5" />
                Catégorie
                <span v-if="filters.categories.length > 0" class="bg-white/20 px-1 py-0.5 rounded text-[10px]">
                  {{ filters.categories.length }}
                </span>
                <Icon name="tabler:chevron-down" class="w-3 h-3" />
              </button>
            </template>
            <template #content>
              <div class="py-1">
                <button
                  @click="filters.categories = []"
                  class="w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center justify-between"
                  :class="filters.categories.length === 0 
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-medium' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'"
                >
                  Toutes
                  <Icon v-if="filters.categories.length === 0" name="tabler:check" class="w-3.5 h-3.5 text-emerald-500" />
                </button>
                <button
                  v-for="cat in categories"
                  :key="cat.value"
                  @click="toggleCategory(cat.value)"
                  class="w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center justify-between"
                  :class="filters.categories.includes(cat.value) 
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-medium' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'"
                >
                  <span class="flex items-center gap-2">
                    <div class="w-2 h-2 rounded-full" :style="{ backgroundColor: cat.color }"></div>
                    {{ cat.label }}
                  </span>
                  <Icon v-if="filters.categories.includes(cat.value)" name="tabler:check" class="w-3.5 h-3.5 text-emerald-500" />
                </button>
              </div>
            </template>
          </AppDropdown>

          <!-- Level Dropdown (Multi-select) -->
          <AppDropdown
            id="level-filter"
            dropdown-class="top-full left-0 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-xl mt-1 overflow-hidden border border-gray-200 dark:border-gray-700"
          >
            <template #trigger="{ isOpen }">
              <button
                class="px-2.5 py-1.5 text-xs font-medium rounded border transition-colors flex items-center gap-1.5"
                :class="isOpen || filters.levels.length > 0
                  ? 'bg-gray-800 dark:bg-gray-700 text-white border-gray-800 dark:border-gray-600' 
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'"
              >
                <Icon name="tabler:alert-circle" class="w-3.5 h-3.5" />
                Niveau
                <span v-if="filters.levels.length > 0" class="bg-white/20 px-1 py-0.5 rounded text-[10px]">
                  {{ filters.levels.length }}
                </span>
                <Icon name="tabler:chevron-down" class="w-3 h-3" />
              </button>
            </template>
            <template #content>
              <div class="py-1">
                <button
                  @click="filters.levels = []"
                  class="w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center justify-between"
                  :class="filters.levels.length === 0 
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-medium' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'"
                >
                  Tous
                  <Icon v-if="filters.levels.length === 0" name="tabler:check" class="w-3.5 h-3.5 text-emerald-500" />
                </button>
                <button
                  v-for="lvl in levels"
                  :key="lvl.value"
                  @click="toggleLevel(lvl.value)"
                  class="w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center justify-between"
                  :class="filters.levels.includes(lvl.value) 
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-medium' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'"
                >
                  <span :style="{ color: lvl.color }">{{ lvl.label }}</span>
                  <Icon v-if="filters.levels.includes(lvl.value)" name="tabler:check" class="w-3.5 h-3.5 text-emerald-500" />
                </button>
              </div>
            </template>
          </AppDropdown>

          <!-- Limit Dropdown -->
          <AppDropdown
            id="limit-filter"
            dropdown-class="top-full left-0 w-24 bg-white dark:bg-gray-800 rounded-lg shadow-xl mt-1 overflow-hidden border border-gray-200 dark:border-gray-700"
          >
            <template #trigger="{ isOpen }">
              <button
                class="px-2.5 py-1.5 text-xs font-medium rounded border transition-colors flex items-center gap-1.5"
                :class="isOpen 
                  ? 'bg-gray-800 dark:bg-gray-700 text-white border-gray-800 dark:border-gray-600' 
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'"
              >
                <Icon name="tabler:list-numbers" class="w-3.5 h-3.5" />
                {{ filters.limit }}
                <Icon name="tabler:chevron-down" class="w-3 h-3" />
              </button>
            </template>
            <template #content="{ close }">
              <div class="py-1">
                <button
                  v-for="lim in limits"
                  :key="lim"
                  @click="filters.limit = String(lim); close()"
                  class="w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center justify-between"
                  :class="filters.limit === String(lim) 
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-medium' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'"
                >
                  {{ lim }}
                  <Icon v-if="filters.limit === String(lim)" name="tabler:check" class="w-3.5 h-3.5 text-emerald-500" />
                </button>
              </div>
            </template>
          </AppDropdown>

          <!-- Search Input -->
          <div class="flex-1 min-w-[150px]">
            <div class="relative">
              <Icon name="tabler:search" class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                v-model="filters.search"
                type="text"
                placeholder="Rechercher..."
                class="w-full pl-8 pr-3 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-500 focus:border-gray-400 dark:focus:border-gray-500"
              />
            </div>
          </div>

          <!-- Delete Button -->
          <button
            @click="confirmDeleteAll"
            class="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
            title="Vider les logs"
          >
            <Icon name="tabler:trash" class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- Main Content (Table) -->
    <div class="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 w-full">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        
        <!-- Loading State -->
        <div v-if="loading" class="p-8 text-center">
          <div class="animate-spin w-8 h-8 border-2 border-gray-300 border-t-emerald-500 rounded-full mx-auto mb-4"></div>
          <p class="text-gray-500 dark:text-gray-400">Chargement des logs...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="p-8 text-center text-red-600 dark:text-red-400">
          <p>{{ error }}</p>
          <button
            class="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            @click="loadLogs"
          >
            Réessayer
          </button>
        </div>

        <!-- Empty State -->
        <div v-else-if="logs.length === 0" class="p-8 text-center text-gray-500 dark:text-gray-400">
          Aucun log trouvé
        </div>

        <!-- Logs Table -->
        <div v-else>
          <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead class="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Heure</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Catégorie</th>
                <th v-if="filters.categories.includes('HARDWARE')" class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Module</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Niveau</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Message</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-10"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
              <tr
                v-for="log in logs"
                :key="log.id"
                class="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                :class="{'bg-red-50 dark:bg-red-900/10': log.level === 'error' || log.level === 'fatal', 'bg-amber-50 dark:bg-amber-900/10': log.level === 'warn'}"
              >
                <td class="px-4 py-2 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400 font-mono">
                  {{ formatTime(log.time) }}
                </td>
                <td class="px-4 py-2 whitespace-nowrap">
                  <span
                    :class="getCategoryClass(log.category)"
                    class="px-2 py-0.5 text-xs font-medium rounded"
                  >
                    {{ formatCategory(log.category) }}
                  </span>
                </td>
                <td v-if="filters.categories.includes('HARDWARE')" class="px-4 py-2 whitespace-nowrap text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                  {{ log.details?.moduleId || '-' }}
                </td>
                <td class="px-4 py-2 whitespace-nowrap">
                  <span
                    :class="getLevelClass(log.level)"
                    class="text-xs font-medium"
                  >
                    {{ log.level }}
                  </span>
                </td>
                <td class="px-4 py-2 text-sm text-gray-900 dark:text-gray-100 font-mono text-xs">
                  {{ log.msg }}
                </td>
                <td class="px-4 py-2 text-right whitespace-nowrap">
                  <button
                    v-if="log.details && Object.keys(log.details).length > 0"
                    @click="openDetails(log)"
                    class="p-1.5 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
                    title="Voir les détails"
                  >
                    <Icon name="tabler:code" class="w-4 h-4" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Sticky Pagination (Bottom) -->
    <div class="sticky bottom-0 z-30 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        <div class="text-sm text-gray-700 dark:text-gray-300">
          {{ offset + 1 }}-{{ Math.min(offset + logs.length, total) }} sur {{ total }}
        </div>
        <div class="flex gap-2">
          <button
            :disabled="offset === 0"
            :class="{ 'opacity-50 cursor-not-allowed': offset === 0 }"
            class="px-3 py-1.5 text-xs font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors"
            @click="previousPage"
          >
            ← Précédent
          </button>
          <button
            :disabled="offset + logs.length >= total"
            :class="{ 'opacity-50 cursor-not-allowed': offset + logs.length >= total }"
            class="px-3 py-1.5 text-xs font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors"
            @click="nextPage"
          >
            Suivant →
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div
      v-if="showDeleteConfirm"
      class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      @click="showDeleteConfirm = false"
    >
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl border border-gray-200 dark:border-gray-700" @click.stop>
        <h3 class="text-lg font-semibold mb-4 text-red-600 dark:text-red-400">Confirmer la suppression</h3>
        <p class="text-gray-700 dark:text-gray-300 mb-6">
          Êtes-vous sûr de vouloir supprimer tous les logs ? Cette action est irréversible.
          <span class="font-semibold">{{ total }} logs</span> seront supprimés.
        </p>
        <div class="flex gap-3 justify-end">
          <button
            class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
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

    <!-- Details Modal -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showDetailsModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        @click="closeDetails"
      >
        <div
          class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-gray-200 dark:border-gray-700 transform transition-all"
          @click.stop
        >
          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Icon name="tabler:code" class="w-5 h-5 text-indigo-500" />
              Détails du Log
            </h3>
            <button
              @click="closeDetails"
              class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              <Icon name="tabler:x" class="w-5 h-5" />
            </button>
          </div>

          <!-- Content -->
          <div class="p-6 overflow-auto custom-scrollbar">
            <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 font-mono text-xs text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
              <pre class="whitespace-pre-wrap">{{ selectedLogDetails }}</pre>
            </div>
            
            <!-- Metadata (Optional) -->
            <div v-if="selectedLog" class="mt-4 grid grid-cols-2 gap-4 text-sm">
               <div class="flex flex-col gap-1">
                 <span class="text-xs text-gray-500 dark:text-gray-400">ID</span>
                 <span class="font-mono text-xs text-gray-700 dark:text-gray-300">{{ selectedLog.id }}</span>
               </div>
               <div class="flex flex-col gap-1">
                 <span class="text-xs text-gray-500 dark:text-gray-400">Timestamp</span>
                 <span class="font-mono text-xs text-gray-700 dark:text-gray-300">{{ formatTime(selectedLog.time) }}</span>
               </div>
            </div>
          </div>
          
          <!-- Footer -->
          <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
            <button
              @click="closeDetails"
              class="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </Transition>
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

const showDetailsModal = ref(false)
const selectedLogDetails = ref('')
const selectedLog = ref<LogEntry | null>(null)

const openDetails = (log: LogEntry) => {
  selectedLog.value = log
  selectedLogDetails.value = log.details ? JSON.stringify(log.details, null, 2) : ''
  showDetailsModal.value = true
}

const closeDetails = () => {
  showDetailsModal.value = false
  setTimeout(() => {
    selectedLog.value = null
    selectedLogDetails.value = ''
  }, 200)
}

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
  { value: 'HARDWARE', label: 'Hardware', color: '#6366f1' }, // Indigo-500
  { value: 'MQTT', label: 'MQTT', color: '#f97316' },     // Orange-500
  { value: 'DB', label: 'DB', color: '#06b6d4' },       // Cyan-500
  { value: 'API', label: 'API', color: '#ec4899' },      // Pink-500
  { value: 'SYSTEM', label: 'System', color: '#94a3b8' },   // Slate-400
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



const formatCategory = (category: string) => {
  if (category === 'HARDWARE') return 'Hardware'
  if (category === 'ESP32') return 'Hardware' // Legacy mapping
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
    HARDWARE: 'text-indigo-500', // Brighter
    ESP32: 'text-indigo-500',    // Legacy
    MQTT: 'text-orange-500',
    DB: 'text-cyan-500',
    API: 'text-pink-500',
    SYSTEM: 'text-slate-400',    // Much brighter
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
  syncFiltersToUrl()
  loadLogs()
})

watch(() => [filters.value.categories, filters.value.levels, filters.value.limit], () => {
  offset.value = 0
  syncFiltersToUrl()
  loadLogs()
}, { deep: true })

// Debounce search
let searchDebounce: NodeJS.Timeout | null = null
watch(() => filters.value.search, () => {
  if (searchDebounce) clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => {
    offset.value = 0
    syncFiltersToUrl()
    loadLogs()
  }, 300)
})

// ============================================================================
// URL Query Params Sync
// ============================================================================

const route = useRoute()
const router = useRouter()

// Sync filters to URL (called on every filter change)
const syncFiltersToUrl = () => {
  const query: Record<string, string | string[]> = {}
  
  if (filters.value.search) query.search = filters.value.search
  if (filters.value.categories.length > 0) query.category = filters.value.categories
  if (filters.value.levels.length > 0) query.level = filters.value.levels
  if (filters.value.limit !== '100') query.limit = filters.value.limit
  if (timeRange.value !== '24h') query.timeRange = timeRange.value
  
  router.replace({ query })
}

// Read URL params and initialize filters
const initFiltersFromUrl = () => {
  // Search
  if (route.query.search) {
    filters.value.search = String(route.query.search)
  }
  
  // Categories (can be string or array)
  if (route.query.category) {
    const cats = Array.isArray(route.query.category) 
      ? route.query.category.map(String) 
      : [String(route.query.category)]
    filters.value.categories = cats.filter(c => categories.some(cat => cat.value === c))
  }
  
  // Levels (can be string or array)
  if (route.query.level) {
    const lvls = Array.isArray(route.query.level) 
      ? route.query.level.map(String) 
      : [String(route.query.level)]
    filters.value.levels = lvls.filter(l => levels.some(lv => lv.value === l))
  }
  
  // Limit
  if (route.query.limit) {
    const lim = String(route.query.limit)
    if (limits.includes(Number(lim))) {
      filters.value.limit = lim
    }
  }
  
  // Time range
  if (route.query.timeRange) {
    const tr = String(route.query.timeRange)
    if (periods.some(p => p.value === tr)) {
      timeRange.value = tr
    }
  }
}

onMounted(() => {
  initFiltersFromUrl()
  loadLogs()
})
</script>
