/**
 * useZones Composable
 * 
 * Centralized state management for zones.
 * Provides reactive zones list and CRUD operations.
 */
import { ref, readonly } from 'vue'

export interface Zone {
  id: string
  name: string
  description?: string | null
  createdAt?: string | null
  devices?: Array<{
    moduleId: string
    name: string | null
    moduleType: string | null
  }>
}

// Shared state (singleton pattern)
const zones = ref<Zone[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)

export const useZones = () => {
  /**
   * Fetch all zones from API
   */
  const fetchZones = async (): Promise<void> => {
    isLoading.value = true
    error.value = null
    try {
      const zonesData = await $fetch<Zone[]>('/api/zones')
      
      // Fetch each zone's devices
      const zonesWithDevices = await Promise.all(
        zonesData.map(async (zone) => {
          try {
            const zoneDetail = await $fetch<Zone>(`/api/zones/${zone.id}`)
            return zoneDetail
          } catch {
            return { ...zone, devices: [] }
          }
        })
      )
      // Sort by createdAt to maintain consistent order
      zones.value = zonesWithDevices.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return dateA - dateB
      })
    } catch (e) {
      console.error('Failed to fetch zones:', e)
      error.value = 'Failed to fetch zones'
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Create a new zone
   */
  const createZone = async (name: string, description?: string): Promise<Zone | null> => {
    if (!name.trim()) return null
    
    try {
      const zone = await $fetch<Zone>('/api/zones', {
        method: 'POST',
        body: { name: name.trim(), description: description?.trim() || null }
      })
      // Add to local state with empty devices
      zones.value.push({ ...zone, devices: [] })
      return zone
    } catch (e) {
      console.error('Failed to create zone:', e)
      error.value = 'Failed to create zone'
      return null
    }
  }

  /**
   * Update an existing zone
   */
  const updateZone = async (id: string, name: string, description?: string | null): Promise<boolean> => {
    if (!name.trim()) return false
    
    try {
      await $fetch(`/api/zones/${id}`, {
        method: 'PUT',
        body: { name: name.trim(), description }
      })
      // Update local state - keep order
      const zone = zones.value.find(z => z.id === id)
      if (zone) {
        zone.name = name.trim()
        zone.description = description
      }
      return true
    } catch (e) {
      console.error('Failed to update zone:', e)
      error.value = 'Failed to update zone'
      return false
    }
  }

  /**
   * Delete a zone
   */
  const deleteZone = async (id: string): Promise<boolean> => {
    try {
      await $fetch(`/api/zones/${id}`, { method: 'DELETE' })
      // Remove from local state
      zones.value = zones.value.filter(z => z.id !== id)
      return true
    } catch (e) {
      console.error('Failed to delete zone:', e)
      error.value = 'Failed to delete zone'
      return false
    }
  }

  /**
   * Assign a device to a zone
   */
  const assignDevice = async (zoneId: string, deviceId: string): Promise<boolean> => {
    try {
      await $fetch(`/api/zones/${zoneId}/devices/${encodeURIComponent(deviceId)}`, {
        method: 'POST',
        body: {} // Required for Fastify
      })
      // Update local state
      const zone = zones.value.find(z => z.id === zoneId)
      if (zone && zone.devices) {
        // Remove from other zones first
        zones.value.forEach(z => {
          if (z.devices) {
            z.devices = z.devices.filter(d => d.moduleId !== deviceId)
          }
        })
        // Add to target zone
        zone.devices.push({ moduleId: deviceId, name: null, moduleType: null })
      }
      return true
    } catch (e) {
      console.error('Failed to assign device:', e)
      error.value = 'Failed to assign device'
      return false
    }
  }

  /**
   * Remove a device from its zone
   */
  const unassignDevice = async (deviceId: string): Promise<boolean> => {
    try {
      await $fetch(`/api/modules/${encodeURIComponent(deviceId)}/zone`, {
        method: 'DELETE'
      })
      // Update local state reactively - create new array to trigger Vue reactivity
      zones.value = zones.value.map(zone => ({
        ...zone,
        devices: zone.devices?.filter(d => d.moduleId !== deviceId) || []
      }))
      return true
    } catch (e) {
      console.error('Failed to unassign device:', e)
      error.value = 'Failed to unassign device'
      return false
    }
  }

  /**
   * Get zone ID by name
   */
  const getZoneIdByName = (name: string): string | null => {
    const zone = zones.value.find(z => z.name === name)
    return zone?.id || null
  }

  return {
    // State (readonly)
    zones: readonly(zones),
    isLoading: readonly(isLoading),
    error: readonly(error),
    
    // Actions
    fetchZones,
    createZone,
    updateZone,
    deleteZone,
    assignDevice,
    unassignDevice,
    getZoneIdByName,
  }
}
