<template>
  <!--
    Zones Management Page
    =====================
    Manage zones (physical locations) and assign devices to them.
  -->
  <div class="min-h-screen bg-gray-50 p-6">
    <div class="max-w-4xl mx-auto">
      
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Zones</h1>
          <p class="text-gray-500 text-sm">Gérez vos zones et assignez des devices</p>
        </div>
        <button 
          @click="showCreateModal = true"
          class="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
        >
          <Icon name="tabler:plus" class="w-5 h-5" />
          Nouvelle zone
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-12">
        <Icon name="tabler:loader" class="w-8 h-8 animate-spin text-gray-400 mx-auto" />
        <p class="text-gray-500 mt-2">Chargement...</p>
      </div>

      <!-- Zones Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        <!-- Unassigned Devices Card -->
        <div class="bg-white rounded-xl border border-dashed border-gray-300 p-4">
          <div class="flex items-center gap-2 mb-3">
            <Icon name="tabler:device-unknown" class="w-5 h-5 text-gray-400" />
            <h3 class="font-medium text-gray-700">Devices non assignés</h3>
            <span class="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {{ unassignedDevices.length }}
            </span>
          </div>
          <div v-if="unassignedDevices.length === 0" class="text-sm text-gray-400 italic">
            Aucun device non assigné
          </div>
          <div v-else class="space-y-2">
            <div 
              v-for="device in unassignedDevices" 
              :key="device.moduleId"
              class="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
            >
              <div>
                <span class="text-sm font-medium text-gray-700">{{ device.name || device.moduleId }}</span>
                <span v-if="device.moduleType" class="text-xs text-gray-400 ml-2">{{ device.moduleType }}</span>
              </div>
              <select 
                @change="assignDevice(device.moduleId, ($event.target as HTMLSelectElement).value)"
                class="text-xs border border-gray-200 rounded px-2 py-1"
              >
                <option value="">Assigner...</option>
                <option v-for="zone in zones" :key="zone.id" :value="zone.id">
                  {{ zone.name }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <!-- Zone Cards -->
        <div 
          v-for="zone in zones" 
          :key="zone.id"
          class="bg-white rounded-xl border border-gray-200 shadow-sm p-4"
        >
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <Icon name="tabler:map-pin" class="w-5 h-5 text-gray-500" />
              <h3 class="font-medium text-gray-800">{{ zone.name }}</h3>
            </div>
            <div class="flex items-center gap-1">
              <button 
                @click="editZone(zone)"
                class="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              >
                <Icon name="tabler:edit" class="w-4 h-4" />
              </button>
              <button 
                @click="deleteZone(zone.id)"
                class="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
              >
                <Icon name="tabler:trash" class="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div v-if="zone.devices?.length === 0" class="text-sm text-gray-400 italic">
            Aucun device
          </div>
          <div v-else class="space-y-1">
            <div 
              v-for="device in zone.devices" 
              :key="device.moduleId"
              class="flex items-center justify-between py-1 px-2 bg-gray-50 rounded text-sm"
            >
              <span class="text-gray-700">{{ device.name || device.moduleId }}</span>
              <button 
                @click="unassignDevice(device.moduleId)"
                class="text-gray-400 hover:text-red-500"
                title="Retirer de la zone"
              >
                <Icon name="tabler:x" class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Create/Edit Modal -->
      <div 
        v-if="showCreateModal || editingZone"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        @click.self="closeModal"
      >
        <div class="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
          <h3 class="text-lg font-semibold mb-4">
            {{ editingZone ? 'Modifier la zone' : 'Nouvelle zone' }}
          </h3>
          <input 
            v-model="zoneName"
            type="text"
            placeholder="Nom de la zone"
            class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            @keyup.enter="saveZone"
          />
          <div class="flex justify-end gap-2 mt-4">
            <button @click="closeModal" class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
              Annuler
            </button>
            <button 
              @click="saveZone"
              class="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
            >
              {{ editingZone ? 'Enregistrer' : 'Créer' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Zones Page
 * Manage physical zones and device assignments
 */

// Types
interface Device {
  moduleId: string
  name: string | null
  moduleType: string | null
}

interface Zone {
  id: string
  name: string
  createdAt: string | null
  devices?: Device[]
}

// State
const loading = ref(true)
const zones = ref<Zone[]>([])
const unassignedDevices = ref<Device[]>([])
const showCreateModal = ref(false)
const editingZone = ref<Zone | null>(null)
const zoneName = ref('')

// Fetch data
const fetchZones = async () => {
  loading.value = true
  try {
    // Fetch zones with devices
    const zonesData = await $fetch<Zone[]>('/api/zones')
    
    // Fetch each zone's devices
    const zonesWithDevices = await Promise.all(
      zonesData.map(async (zone) => {
        const zoneDetail = await $fetch<Zone>(`/api/zones/${zone.id}`)
        return zoneDetail
      })
    )
    zones.value = zonesWithDevices
    
    // Fetch all devices to find unassigned ones
    const modules = await $fetch<{ id: string; name: string }[]>('/api/modules')
    const allDevices = await Promise.all(
      modules.map(async (m) => {
        try {
          const status = await $fetch<any>(`/api/modules/${encodeURIComponent(m.id)}/status`)
          return {
            moduleId: m.id,
            name: status.preferences?.name || null,
            moduleType: status.sensorsConfig?.sensors ? 'air-quality' : null,
            zoneId: null // We don't have this info yet
          }
        } catch {
          return { moduleId: m.id, name: null, moduleType: null, zoneId: null }
        }
      })
    )
    
    // Filter unassigned (not in any zone)
    const assignedIds = new Set(
      zonesWithDevices.flatMap(z => z.devices?.map(d => d.moduleId) || [])
    )
    unassignedDevices.value = allDevices.filter(d => !assignedIds.has(d.moduleId))
    
  } catch (e) {
    console.error('Failed to fetch zones:', e)
  } finally {
    loading.value = false
  }
}

// Actions
const saveZone = async () => {
  if (!zoneName.value.trim()) return
  
  try {
    if (editingZone.value) {
      await $fetch(`/api/zones/${editingZone.value.id}`, {
        method: 'PUT',
        body: { name: zoneName.value }
      })
    } else {
      await $fetch('/api/zones', {
        method: 'POST',
        body: { name: zoneName.value }
      })
    }
    closeModal()
    await fetchZones()
  } catch (e) {
    console.error('Failed to save zone:', e)
  }
}

const editZone = (zone: Zone) => {
  editingZone.value = zone
  zoneName.value = zone.name
}

const deleteZone = async (id: string) => {
  if (!confirm('Supprimer cette zone ?')) return
  try {
    await $fetch(`/api/zones/${id}`, { method: 'DELETE' })
    await fetchZones()
  } catch (e) {
    console.error('Failed to delete zone:', e)
  }
}

const assignDevice = async (deviceId: string, zoneId: string) => {
  if (!zoneId) return
  try {
    await $fetch(`/api/zones/${zoneId}/devices/${encodeURIComponent(deviceId)}`, {
      method: 'POST'
    })
    await fetchZones()
  } catch (e) {
    console.error('Failed to assign device:', e)
  }
}

const unassignDevice = async (deviceId: string) => {
  // Remove from zone by setting zoneId to null
  try {
    await $fetch(`/api/modules/${encodeURIComponent(deviceId)}/preferences`, {
      method: 'PATCH',
      body: { zoneId: null }
    })
    await fetchZones()
  } catch (e) {
    console.error('Failed to unassign device:', e)
  }
}

const closeModal = () => {
  showCreateModal.value = false
  editingZone.value = null
  zoneName.value = ''
}

// Load on mount
onMounted(fetchZones)
</script>
