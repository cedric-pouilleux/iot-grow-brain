<template>
  <!--
    ModuleLayout.vue
    =================
    Reusable layout for module panels.
    
    Slots:
    - loading: Custom loading content
    - header-left: Title/icon on left side
    - header-right: Action buttons on right side
    - options: Collapsible options panel
    - default: Main content area
  -->
  <div class="mb-6">
    <!-- Loading state -->
    <div v-if="loading" class="text-center py-8 text-gray-400">
      <slot name="loading">
        <div
          class="animate-spin w-8 h-8 border-2 border-gray-300 border-t-emerald-500 rounded-full mx-auto mb-4"
        ></div>
        <span>{{ loadingText }}</span>
      </slot>
    </div>

    <template v-else>
      <!-- Header -->
      <div class="py-2">
        <div class="flex flex-wrap justify-between items-center gap-3">
          <!-- Left: Title slot -->
          <slot name="header-left" />
          
          <!-- Right: Options slot -->
          <div class="flex items-center gap-2">
            <slot name="header-right" />
          </div>
        </div>
      </div>

      <!-- Options Panel (collapsible) -->
      <slot name="options" />

      <!-- Main Content -->
      <slot />
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * ModuleLayout
 * 
 * Reusable layout component for all module types.
 * Provides consistent structure with:
 * - Header with left/right slots
 * - Collapsible options panel slot
 * - Main content area
 */

interface Props {
  loading?: boolean
  loadingText?: string
}

withDefaults(defineProps<Props>(), {
  loading: false,
  loadingText: 'Chargement...',
})
</script>
