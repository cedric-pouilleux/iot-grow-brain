import { ref } from 'vue'

// Global state to track the ID of the currently active dropdown
const activeDropdownId = ref<string | null>(null)

export const useDropdownRegistry = () => {
  /**
   * Request to open a specific dropdown.
   * This effectively closes any other open dropdown that respects the registry.
   */
  const open = (id: string) => {
    activeDropdownId.value = id
  }

  /**
   * Close the currently active dropdown.
   * Optionally checks if the ID matches before closing (to avoid closing a newly opened one).
   */
  const close = (id?: string) => {
    if (id && activeDropdownId.value !== id) return
    activeDropdownId.value = null
  }

  /**
   * Check if a specific dropdown should be open.
   */
  const isActive = (id: string) => activeDropdownId.value === id

  return {
    activeDropdownId,
    open,
    close,
    isActive,
  }
}
