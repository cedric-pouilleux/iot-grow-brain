<script setup lang="ts">
/**
 * MemoryBar - Reusable memory/storage visualization bar
 * Supports both single-segment (RAM) and multi-segment (Flash) modes
 */

interface Segment {
  /** Percentage width (0-100) */
  percent: number
  /** Tailwind background color class */
  color: string
  /** Label to display if segment is wide enough */
  label?: string
  /** Minimum percent to show label */
  labelMinPercent?: number
  /** Tooltip text */
  tooltip?: string
  /** Text color class for label */
  labelColor?: string
}

interface Props {
  /** Bar label (e.g., "Flash", "RAM") */
  label: string
  /** Used value formatted (e.g., "1.2MB") */
  usedFormatted: string
  /** Total value formatted (e.g., "4MB") */
  totalFormatted: string
  /** Segments to display - for multi-segment mode */
  segments?: Segment[]
  /** Single segment percent - for simple mode */
  percent?: number
  /** Single segment tooltip - for simple mode */
  tooltip?: string
  /** Show percentage text inside bar for simple mode */
  showPercent?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  segments: undefined,
  percent: 0,
  tooltip: undefined,
  showPercent: false,
})

// Use segments mode if provided, otherwise single segment mode
const isMultiSegment = computed(() => props.segments && props.segments.length > 0)
</script>

<template>
  <div class="text-xs">
    <!-- Header: Label and Usage -->
    <div class="flex justify-between mb-0.5">
      <span class="text-gray-400">{{ label }}</span>
      <span class="text-gray-500 text-[9px]">{{ usedFormatted }} / {{ totalFormatted }}</span>
    </div>
    
    <!-- Bar Container -->
    <div class="h-4 bg-gray-100 rounded overflow-hidden flex" :class="{ 'cursor-help': !isMultiSegment && tooltip }">
      <!-- Multi-segment mode (Flash) -->
      <template v-if="isMultiSegment">
        <div
          v-for="(segment, index) in segments"
          :key="index"
          v-show="segment.percent > 0"
          class="h-full flex items-center justify-center cursor-help"
          :class="segment.color"
          :style="{ width: segment.percent + '%' }"
          :title="segment.tooltip"
        >
          <span
            v-if="segment.label && segment.percent > (segment.labelMinPercent ?? 10)"
            class="text-[9px] font-medium"
            :class="segment.labelColor ?? 'text-gray-100'"
          >
            {{ segment.label }}
          </span>
        </div>
      </template>
      
      <!-- Single segment mode (RAM) -->
      <template v-else>
        <div
          class="bg-gray-400 h-full flex items-center justify-center"
          :style="{ width: percent + '%' }"
          :title="tooltip"
        >
          <span v-if="showPercent && percent > 12" class="text-[9px] font-medium text-gray-100">
            {{ Math.round(percent) }}%
          </span>
        </div>
      </template>
    </div>
  </div>
</template>
