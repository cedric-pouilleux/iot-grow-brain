
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
      const data = await $fetch<ModuleStorageStats>(`${apiUrl}/api/modules/${moduleId.value}/storage`)
      
      if (data) {
        storageStats.value = data
      }
    } catch (e) {
      console.error('Failed to fetch storage stats:', e)
    } finally {
      loading.value = false
    }
  }

  // Calculate projections based on active sensors intervals
  // We accept an optional mapping of "sensorType" -> "overrideInterval"
  const projections = (customIntervals: Ref<Record<string, number> | undefined>) => computed(() => {
    if (!storageStats.value) return { daily: 0, monthly: 0, yearly: 0 }
    
    let dailyRows = 0
    
    // We iterate over active sensors from valid stats first
    storageStats.value.activeSensors.forEach(s => {
      // Check if we have an override (override applies to all sensors of that type? 
      // Actually standardizing: HardwareSensorRow emits per Hardware Key (e.g. 'sgp40'). 
      // SGP40 corresponds to 'voc' sensor type etc.
      // Wait, backend response `activeSensors` has `sensorType`.
      // HardwareSensorRow has `hardwareKey` (e.g. 'mhz14a').
      // We need mapping hardwareKey -> sensorType(s).
      
      // Let's assume for now the user passes a map of sensorType -> interval
      // OR let the caller handle the mapping.
      // The simplest is: caller passes map[sensorType] -> interval.
            
      const override = customIntervals.value?.[s.sensorType]
      const interval = (override !== undefined) ? override : (s.intervalSeconds && s.intervalSeconds > 0 ? s.intervalSeconds : 60)
      
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
    projections, // Now a function that returns a computed
    loading,
    error,
    fetchStorageStats
  }
}
