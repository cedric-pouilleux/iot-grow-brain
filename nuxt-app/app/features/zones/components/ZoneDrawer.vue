<template>
  <!--
    ZoneDrawer.vue
    ==============
    Left-side drawer for zone CRUD operations.
    Slides in from left with smooth animation.
  -->
  
  <!-- Backdrop -->
  <Teleport to="body">
    <Transition name="fade">
      <div 
        v-if="isOpen"
        class="fixed inset-0 bg-black/40 z-40"
        @click="$emit('close')"
      />
    </Transition>
    
    <!-- Drawer -->
    <Transition name="slide-left">
      <div 
        v-if="isOpen"
        class="fixed top-0 left-0 h-full w-96 bg-white dark:bg-gray-800 shadow-2xl z-50 flex flex-col"
      >
        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-100">Gestion des Zones</h2>
          <button 
            @click="$emit('close')"
            class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <Icon name="tabler:x" class="w-5 h-5" />
          </button>
        </div>
        
        <!-- Create Zone -->
        <div class="p-4 border-b border-gray-100 dark:border-gray-700">
          <div class="space-y-2">
            <input
              v-model="newZoneName"
              type="text"
              placeholder="Nom de la zone..."
              class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 focus:border-transparent"
              @keyup.enter="handleCreateZone"
            />
            <input
              v-model="newZoneDescription"
              type="text"
              placeholder="Description (optionnel)..."
              class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 focus:border-transparent"
              @keyup.enter="handleCreateZone"
            />
            <button
              @click="handleCreateZone"
              :disabled="!newZoneName.trim()"
              class="w-full px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
            >
              <Icon name="tabler:plus" class="w-4 h-4" />
              <span class="text-sm">Créer la zone</span>
            </button>
          </div>
        </div>
        
        <!-- Zones List -->
        <div class="flex-1 overflow-y-auto p-4 space-y-3">
          <div v-if="isLoading" class="text-center py-8">
            <Icon name="tabler:loader" class="w-6 h-6 animate-spin text-gray-400 mx-auto" />
            <p class="text-sm text-gray-500 mt-2">Chargement...</p>
          </div>
          
          <div v-else-if="zones.length === 0" class="text-center py-8">
            <Icon name="tabler:map-pin-off" class="w-8 h-8 text-gray-300 mx-auto" />
            <p class="text-sm text-gray-400 mt-2">Aucune zone créée</p>
          </div>
          
          <div 
            v-else
            v-for="zone in zones"
            :key="zone.id"
            class="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-700"
          >
            <!-- Zone Header -->
            <div class="flex items-center justify-between p-3">
              <div class="flex items-center gap-2 flex-1 min-w-0">
                <Icon name="tabler:map-pin" class="w-4 h-4 text-gray-400 flex-shrink-0" />
                
                <!-- Edit Mode -->
                <template v-if="editingZoneId === zone.id">
                  <div class="flex-1 space-y-1">
                    <input
                      v-model="editingZoneName"
                      type="text"
                      placeholder="Nom"
                      class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      @keyup.enter="saveZoneEdit(zone.id)"
                      @keyup.escape="cancelEdit"
                      ref="editInput"
                    />
                    <input
                      v-model="editingZoneDescription"
                      type="text"
                      placeholder="Description (optionnel)"
                      class="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      @keyup.enter="saveZoneEdit(zone.id)"
                      @keyup.escape="cancelEdit"
                    />
                  </div>
                  <button @click="saveZoneEdit(zone.id)" class="p-1 text-emerald-500 hover:text-emerald-600">
                    <Icon name="tabler:check" class="w-4 h-4" />
                  </button>
                  <button @click="cancelEdit" class="p-1 text-gray-400 hover:text-gray-600">
                    <Icon name="tabler:x" class="w-4 h-4" />
                  </button>
                </template>
                
                <!-- View Mode -->
                <template v-else>
                  <div class="flex-1 min-w-0">
                    <span class="font-medium text-gray-800 dark:text-gray-100 truncate block">{{ zone.name }}</span>
                    <span v-if="zone.description" class="text-xs text-gray-400 dark:text-gray-500 truncate block">{{ zone.description }}</span>
                  </div>
                  <span class="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                    {{ zone.devices?.length || 0 }} device{{ (zone.devices?.length || 0) !== 1 ? 's' : '' }}
                  </span>
                </template>
              </div>
              
              <!-- Actions (View Mode) -->
              <div v-if="editingZoneId !== zone.id" class="flex items-center gap-1 flex-shrink-0">
                <button 
                  @click="startEdit(zone)"
                  class="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                  title="Renommer"
                >
                  <Icon name="tabler:edit" class="w-3.5 h-3.5" />
                </button>
                <button 
                  @click="handleDeleteZone(zone)"
                  class="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  title="Supprimer"
                >
                  <Icon name="tabler:trash" class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            
            <!-- Devices List (Collapsed) -->
            <div v-if="zone.devices && zone.devices.length > 0" class="px-3 pb-3">
              <div class="space-y-1">
                <div 
                  v-for="device in zone.devices"
                  :key="device.moduleId"
                  class="flex items-center justify-between py-1.5 px-2 bg-white dark:bg-gray-800 rounded text-sm border border-gray-100 dark:border-gray-700"
                >
                  <span class="text-gray-700 dark:text-gray-200 truncate">{{ device.name || device.moduleId }}</span>
                  <button 
                    @click="handleUnassignDevice(device.moduleId)"
                    class="p-0.5 text-gray-400 hover:text-red-500 transition-colors"
                    title="Retirer de la zone"
                  >
                    <Icon name="tabler:x" class="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * ZoneDrawer
 * 
 * Left-side drawer for zone management (CRUD).
 * Uses useZones composable for state management.
 */
import { ref, watch, nextTick } from 'vue'
import { useZones } from '~/features/zones/composables/useZones'

// ============================================================================
// Props & Emits
// ============================================================================

const props = defineProps<{
  isOpen: boolean
  currentDeviceId?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'zone-changed'): void
}>()

// ============================================================================
// Composables
// ============================================================================

const { zones, isLoading, fetchZones, createZone, updateZone, deleteZone, unassignDevice } = useZones()

// Snackbar for feedback
import { useSnackbar } from '~/components/design-system/UISnackbar/useSnackbar'
const { showSnackbar } = useSnackbar()

// ============================================================================
// Local State
// ============================================================================

const newZoneName = ref('')
const newZoneDescription = ref('')
const editingZoneId = ref<string | null>(null)
const editingZoneName = ref('')
const editingZoneDescription = ref('')
const editInput = ref<HTMLInputElement | null>(null)

// ============================================================================
// Actions
// ============================================================================

const handleCreateZone = async () => {
  if (!newZoneName.value.trim()) return
  
  const zone = await createZone(newZoneName.value, newZoneDescription.value || undefined)
  if (zone) {
    newZoneName.value = ''
    newZoneDescription.value = ''
    showSnackbar(`Zone "${zone.name}" créée`, 'success')
    emit('zone-changed')
  } else {
    showSnackbar('Erreur lors de la création', 'error')
  }
}

const startEdit = (zone: { id: string; name: string; description?: string | null }) => {
  editingZoneId.value = zone.id
  editingZoneName.value = zone.name
  editingZoneDescription.value = zone.description || ''
  nextTick(() => {
    editInput.value?.focus()
  })
}

const cancelEdit = () => {
  editingZoneId.value = null
  editingZoneName.value = ''
  editingZoneDescription.value = ''
}

const saveZoneEdit = async (id: string) => {
  if (!editingZoneName.value.trim()) {
    cancelEdit()
    return
  }
  
  const success = await updateZone(id, editingZoneName.value, editingZoneDescription.value || null)
  if (success) {
    showSnackbar(`Zone mise à jour`, 'success')
    emit('zone-changed')
  } else {
    showSnackbar('Erreur lors de la mise à jour', 'error')
  }
  cancelEdit()
}

const handleDeleteZone = async (zone: { id: string; name: string }) => {
  if (!confirm(`Supprimer la zone "${zone.name}" ? Les devices seront désassignés.`)) return
  
  const success = await deleteZone(zone.id)
  if (success) {
    showSnackbar(`Zone "${zone.name}" supprimée`, 'success')
    emit('zone-changed')
  } else {
    showSnackbar('Erreur lors de la suppression', 'error')
  }
}

const handleUnassignDevice = async (deviceId: string) => {
  const success = await unassignDevice(deviceId)
  if (success) {
    showSnackbar('Device retiré de la zone', 'info')
    emit('zone-changed')
  } else {
    showSnackbar('Erreur lors du retrait', 'error')
  }
}

// ============================================================================
// Lifecycle
// ============================================================================

// Fetch zones when drawer opens
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    fetchZones()
  }
})
</script>

<style scoped>
/* Backdrop fade */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Drawer slide from left */
.slide-left-enter-active,
.slide-left-leave-active {
  transition: transform 0.3s ease;
}

.slide-left-enter-from,
.slide-left-leave-to {
  transform: translateX(-100%);
}
</style>
