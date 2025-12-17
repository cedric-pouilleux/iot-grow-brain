<template>
  <div :class="[position]" ref="containerRef">
    <!-- Trigger Slot -->
    <div @click.stop="toggle" class="cursor-pointer group w-fit">
      <slot name="trigger" :isOpen="isOpen" :toggle="toggle" :close="close"></slot>
    </div>

    <!-- Dropdown Content -->
    <div
      v-if="isOpen"
      class="absolute z-[100]"
      :class="dropdownClasses"
      @click.stop
    >
      <slot name="content" :isOpen="isOpen" :close="close"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { useDropdownRegistry } from '../composables/useDropdownRegistry'

interface Props {
  /**
   * Optional manual ID. If not provided, a random UUID is generated.
   */
  id?: string
  /**
   * Classes to apply to the dropdown container (e.g. for positioning).
   * Default: 'top-full left-0'
   */
  dropdownClass?: string
  /**
   * If true, this dropdown acts independently and doesn't close others / isn't closed by others.
   */
  independent?: boolean
  /**
   * Position class for the wrapper. Default 'relative'.
   * Pass 'static' to allow dropdown content to be absolute relative to a parent container.
   */
  position?: string
}

const props = withDefaults(defineProps<Props>(), {
  id: undefined,
  dropdownClass: '',
  independent: false,
  position: 'relative',
})

const { open: registryOpen, close: registryClose, isActive } = useDropdownRegistry()

// Generate a stable ID if none provided
const dropdownId = props.id || `dropdown-${uuidv4()}`

// Local state for independent mode
const localOpen = ref(false)

const isOpen = computed(() => {
  if (props.independent) return localOpen.value
  return isActive(dropdownId)
})

const open = () => {
  if (props.independent) localOpen.value = true
  else registryOpen(dropdownId)
}

const close = () => {
  if (props.independent) localOpen.value = false
  else registryClose(dropdownId)
}

const toggle = () => {
  isOpen.value ? close() : open()
}

// Click Outside Logic
const containerRef = ref<HTMLElement | null>(null)

const handleGlobalClick = (event: Event) => {
  if (!isOpen.value) return
  if (containerRef.value && !containerRef.value.contains(event.target as Node)) {
    close()
  }
}

onMounted(() => {
  document.addEventListener('click', handleGlobalClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleGlobalClick)
})

// Classes
const dropdownClasses = computed(() => {
  return props.dropdownClass
})
</script>
