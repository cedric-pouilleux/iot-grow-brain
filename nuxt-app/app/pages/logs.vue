<template>
  <div class="min-h-screen bg-gray-100 p-4 sm:p-8">
    <div class="max-w-7xl mx-auto">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-800">System Logs</h1>
          <p class="text-gray-600 mt-2">Historique complet des événements système</p>
        </div>
        <button
          class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
          @click="confirmDeleteAll"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
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

      <!-- Filters -->
      <div class="bg-white rounded-lg shadow p-4 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Catégorie</label>
            <select
              v-model="filters.category"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">Toutes</option>
              <option value="ESP32">ESP32</option>
              <option value="MQTT">MQTT</option>
              <option value="DB">DB</option>
              <option value="API">API</option>
              <option value="SYSTEM">System</option>
              <option value="WEBSOCKET">WebSocket</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Niveau</label>
            <select
              v-model="filters.level"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">Tous</option>
              <option value="trace">Trace</option>
              <option value="debug">Debug</option>
              <option value="info">Info</option>
              <option value="warn">Warn</option>
              <option value="error">Error</option>
              <option value="fatal">Fatal</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Recherche</label>
            <input
              v-model="filters.search"
              type="text"
              placeholder="Mots-clés..."
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Limite</label>
            <select
              v-model="filters.limit"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
              <option value="500">500</option>
            </select>
          </div>

          <div class="flex items-end">
            <button
              class="w-full px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
              @click="loadLogs"
            >
              Rechercher
            </button>
          </div>
        </div>
      </div>

      <!-- Logs Table -->
      <div class="bg-white rounded-lg shadow overflow-hidden">
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

        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Temps
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Catégorie
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Niveau
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Message
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Détails
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="log in logs" :key="log.id" class="hover:bg-gray-50 transition-colors">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ formatTime(log.time) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span
                    :class="getCategoryClass(log.category)"
                    class="px-2 py-1 text-xs font-medium rounded-full"
                  >
                    {{ log.category }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span
                    :class="getLevelClass(log.level)"
                    class="px-2 py-1 text-xs font-medium rounded-full"
                  >
                    {{ log.level }}
                  </span>
                </td>
                <td class="px-6 py-4 text-sm text-gray-900">
                  {{ log.msg }}
                </td>
                <td class="px-6 py-4 text-sm text-gray-500">
                  <button
                    v-if="log.details && Object.keys(log.details).length > 0"
                    class="text-emerald-600 hover:text-emerald-800"
                    @click="selectedLog = log"
                  >
                    Voir
                  </button>
                  <span v-else class="text-gray-400">-</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div
          v-if="!loading && logs.length > 0"
          class="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200"
        >
          <div class="text-sm text-gray-700">
            Affichage de {{ offset + 1 }} à {{ Math.min(offset + logs.length, total) }} sur
            {{ total }} logs
          </div>
          <div class="flex gap-2">
            <button
              :disabled="offset === 0"
              :class="{ 'opacity-50 cursor-not-allowed': offset === 0 }"
              class="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              @click="previousPage"
            >
              Précédent
            </button>
            <button
              :disabled="offset + logs.length >= total"
              :class="{ 'opacity-50 cursor-not-allowed': offset + logs.length >= total }"
              class="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              @click="nextPage"
            >
              Suivant
            </button>
          </div>
        </div>
      </div>

      <!-- Details Modal -->
      <div
        v-if="selectedLog"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        @click="selectedLog = null"
      >
        <div
          class="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-auto"
          @click.stop
        >
          <h3 class="text-lg font-semibold mb-4">Détails du log</h3>
          <pre class="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm">{{
            JSON.stringify(selectedLog.details, null, 2)
          }}</pre>
          <button
            class="mt-4 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            @click="selectedLog = null"
          >
            Fermer
          </button>
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
const selectedLog = ref<LogEntry | null>(null)
const showDeleteConfirm = ref(false)
const deleting = ref(false)

const filters = ref({
  category: '',
  level: '',
  search: '',
  limit: '100',
})

const loadLogs = async () => {
  loading.value = true
  error.value = null

  try {
    const params = new URLSearchParams({
      limit: filters.value.limit,
      offset: String(offset.value),
    })

    if (filters.value.category) params.append('category', filters.value.category)
    if (filters.value.level) params.append('level', filters.value.level)
    if (filters.value.search) params.append('search', filters.value.search)

    // Use relative URL to leverage Nuxt proxy
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
  return new Date(time).toLocaleString('fr-FR')
}

const getLevelClass = (level: string) => {
  const classes = {
    trace: 'bg-gray-100 text-gray-800',
    debug: 'bg-blue-100 text-blue-800',
    info: 'bg-emerald-100 text-emerald-800',
    warn: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    fatal: 'bg-purple-100 text-purple-800',
  }
  return classes[level as keyof typeof classes] || 'bg-gray-100 text-gray-800'
}

const getCategoryClass = (category: string) => {
  const classes = {
    ESP32: 'bg-indigo-100 text-indigo-800',
    MQTT: 'bg-orange-100 text-orange-800',
    DB: 'bg-cyan-100 text-cyan-800',
    API: 'bg-pink-100 text-pink-800',
    SYSTEM: 'bg-slate-100 text-slate-800',
    WEBSOCKET: 'bg-violet-100 text-violet-800',
  }
  return classes[category as keyof typeof classes] || 'bg-gray-100 text-gray-800'
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

    // Reset pagination and reload logs
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

onMounted(() => {
  loadLogs()
})
</script>
