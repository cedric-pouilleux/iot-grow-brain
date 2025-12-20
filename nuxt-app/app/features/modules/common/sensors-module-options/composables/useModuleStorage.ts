
export interface ModuleStorageStats {
  rowCount: number
  estimatedSizeBytes: number
  oldestMeasurement: string | null
  newestMeasurement: string | null
  activeSensors: Array<{
    sensorType: string
    intervalSeconds: number | null
    rowCount: number
  }>
}

export function useModuleStorage(moduleId: Ref<string>) {
  const storageStats = ref<ModuleStorageStats | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  const config = useRuntimeConfig()
  const apiUrl = config.public.apiBase || 'http://localhost:3001'

  const fetchStorageStats = async () => {
    if (!moduleId.value) return
    
    loading.value = true
    error.value = null
    
    try {
      const { data } = await useFetch<ModuleStorageStats>(`${apiUrl}/api/modules/${moduleId.value}/storage`, {
        key: `module-storage-${moduleId.value}`
      })
      
      if (data.value) {
        storageStats.value = data.value
      }
    } catch (e) {
      console.error('Failed to fetch storage stats:', e)
      error.value = 'Failed to load storage stats'
    } finally {
      loading.value = false
    }
  }
  
  // Calculate projections based on active sensors intervals
  const projections = computed(() => {
    if (!storageStats.value) return { daily: 0, monthly: 0, yearly: 0 }
    
    let dailyRows = 0
    
    storageStats.value.activeSensors.forEach(s => {
      // Default interval 60s if null or invalid
      const interval = (s.intervalSeconds && s.intervalSeconds > 0) ? s.intervalSeconds : 60
      const measurementsPerDay = (24 * 60 * 60) / interval
      dailyRows += measurementsPerDay
    })
    
    const bytesPerRow = 100 // Estimate
    
    const daily = dailyRows * bytesPerRow
    
    return {
      daily,
      monthly: daily * 30,
      yearly: daily * 365
    }
  })
  
  return {
    storageStats,
    projections,
    loading,
    error,
    fetchStorageStats
  }
}
