<template>
  <div :class="[position]" ref="containerRef">
    <!-- Trigger Slot -->
    <div @click.stop="toggle" class="cursor-pointer group w-full">
      <slot name="trigger" :isOpen="isOpen" :toggle="toggle" :close="close" :size="size" :sizeClasses="sizeClasses"></slot>
    </div>

    <!-- Dropdown Content -->
    <Transition name="dropdown">
      <div
        v-if="isOpen"
        class="absolute z-[100]"
        :class="dropdownClasses"
        @click.stop
      >
        <slot name="content" :isOpen="isOpen" :close="close"></slot>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { useDropdownRegistry } from './useDropdownRegistry'

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
  /**
   * Position class for the wrapper. Default 'relative'.
   * Pass 'static' to allow dropdown content to be absolute relative to a parent container.
   */
  position?: string
  /**
   * Size of the trigger when using default styles or exposed via slot.
   * 'small' | 'middle' | 'large'
   * Default: 'middle'
   */
  size?: 'small' | 'middle' | 'large'
}

const props = withDefaults(defineProps<Props>(), {
  id: undefined,
  dropdownClass: '',
  independent: false,
  position: 'relative',
  size: 'middle'
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
  document.addEventListener('mousedown', handleGlobalClick)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleGlobalClick)
})

const dropdownClasses = computed(() => {
  return props.dropdownClass
})

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'small':
      return 'h-7 text-xs px-2 gap-1 rounded'
    case 'large':
      return 'h-10 text-base px-4 gap-2 rounded-lg'
    default: // middle
      return 'h-8 text-sm px-3 gap-1.5 rounded-lg'
  }
})
</script>

<style scoped>
/* Dropdown slide animation */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.15s ease-out;
  transform-origin: top;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: scaleY(0.9);
}
</style>
