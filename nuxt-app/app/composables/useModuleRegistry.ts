/**
 * useModuleRegistry Composable
 * 
 * Provides access to module type definitions (manifests) from the backend.
 * Caches manifests to avoid repeated API calls.
 */

// ============================================================================
// Types
// ============================================================================

export interface HardwareDef {
  key: string
  name: string
  type: 'sensor' | 'actuator'
  sensors: string[]
}

export interface SensorDef {
  key: string
  label: string
  unit: string
  range: [number, number]
}

export interface ActionDef {
  id: string
  label: string
  icon: string
  scope: 'sensor' | 'hardware' | 'device'
}

export interface ModuleManifest {
  id: string
  name: string
  version: string
  hardware: HardwareDef[]
  sensors: SensorDef[]
  actions: ActionDef[]
}

export interface ModuleTypeSummary {
  id: string
  name: string
  version: string
}

// ============================================================================
// Composable
// ============================================================================

export const useModuleRegistry = () => {
  // Cache manifests in a state that persists across components
  const manifests = useState<Map<string, ModuleManifest>>('module-manifests', () => new Map())
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Fetch list of available module types
   */
  const fetchModuleTypes = async (): Promise<ModuleTypeSummary[]> => {
    try {
      return await $fetch<ModuleTypeSummary[]>('/api/modules/types')
    } catch (e: any) {
      console.error('Failed to fetch module types:', e)
      return []
    }
  }

  /**
   * Fetch and cache a module manifest
   */
  const loadManifest = async (moduleType: string): Promise<ModuleManifest | null> => {
    // Return cached if available
    if (manifests.value.has(moduleType)) {
      return manifests.value.get(moduleType)!
    }

    loading.value = true
    error.value = null

    try {
      const manifest = await $fetch<ModuleManifest>(`/api/modules/types/${moduleType}/manifest`)
      manifests.value.set(moduleType, manifest)
      return manifest
    } catch (e: any) {
      error.value = `Failed to load manifest for ${moduleType}`
      console.error(error.value, e)
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Get cached manifest (returns undefined if not loaded)
   */
  const getManifest = (moduleType: string): ModuleManifest | undefined => {
    return manifests.value.get(moduleType)
  }

  /**
   * Get hardware definitions from a manifest
   */
  const getHardware = (moduleType: string): HardwareDef[] => {
    return manifests.value.get(moduleType)?.hardware || []
  }

  /**
   * Get sensor definitions from a manifest  
   */
  const getSensors = (moduleType: string): SensorDef[] => {
    return manifests.value.get(moduleType)?.sensors || []
  }

  /**
   * Get sensor label by key (searches cached manifests)
   */
  const getSensorLabel = (sensorKey: string): string => {
    for (const manifest of manifests.value.values()) {
      const sensor = manifest.sensors.find(s => s.key === sensorKey)
      if (sensor) return sensor.label
    }
    return sensorKey // Fallback to key
  }

  /**
   * Get sensor unit by key
   */
  const getSensorUnit = (sensorKey: string): string => {
    for (const manifest of manifests.value.values()) {
      const sensor = manifest.sensors.find(s => s.key === sensorKey)
      if (sensor) return sensor.unit
    }
    return ''
  }

  return {
    manifests: readonly(manifests),
    loading: readonly(loading),
    error: readonly(error),
    fetchModuleTypes,
    loadManifest,
    getManifest,
    getHardware,
    getSensors,
    getSensorLabel,
    getSensorUnit
  }
}
