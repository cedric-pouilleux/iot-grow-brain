<template>
  <div class="">
    <div class="grid grid-cols-1 grid-rows-[100px_24px] gap-y-1">
      <!-- Chart Area -->
      <div 
        class="relative cursor-crosshair" 
        ref="chartRef"
        @mousedown="startDrag"
        @mousemove="onDrag"
        @mouseup="endDrag"
        @mouseleave="endDrag"
      >
        <svg 
          width="100%" 
          height="100%" 
          preserveAspectRatio="none"
          :viewBox="`0 0 ${bucketCount} 100`"
          shape-rendering="crispEdges"
          class="block"
        >
          <!-- Bars with stacked category segments -->
          <g v-for="(bucket, i) in buckets" :key="i">
            <rect
              v-for="(segment, j) in bucket.segments"
              :key="j"
              :x="i"
              :y="100 - segment.y - segment.height"
              width="1"
              :height="segment.height"
              :fill="segment.color"
            />
          </g>

          <!-- Selection overlay -->
          <rect
            v-if="isDragging && dragStart !== null && dragEnd !== null"
            :x="Math.min(dragStart, dragEnd)"
            y="0"
            :width="Math.abs(dragEnd - dragStart)"
            height="100"
            fill="rgba(59, 130, 246, 0.3)"
            stroke="#3b82f6"
            stroke-width="0.1"
          />

          <!-- Active selection highlight -->
          <rect
            v-if="selectionRange"
            :x="selectionRange.startX"
            y="0"
            :width="selectionRange.endX - selectionRange.startX"
            height="100"
            fill="rgba(59, 130, 246, 0.2)"
            stroke="#3b82f6"
            stroke-width="0.1"
          />
        </svg>

        <!-- Tooltip -->
        <div 
          v-if="tooltip.show" 
          class="absolute bg-gray-800 dark:bg-gray-900 text-white p-2 rounded-md text-[11px] pointer-events-none z-50 min-w-[120px] shadow-lg border border-gray-700" 
          :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
        >
          <div class="font-medium mb-1 pb-1 border-b border-gray-700">{{ tooltip.time }}</div>
          <div v-for="cat in tooltip.categories" :key="cat.name" class="flex items-center gap-1.5 my-0.5">
            <span class="w-2 h-2 rounded-full" :style="{ background: cat.color }"></span>
            {{ cat.name }}: {{ cat.count }}
          </div>
          <div class="mt-1 pt-1 border-t border-gray-700 font-medium">Total: {{ formatNumber(tooltip.total) }}</div>
        </div>
      </div>

      <!-- X Axis -->
      <div class="relative h-5 text-[10px] text-gray-400 dark:text-gray-500">
        <span 
          v-for="label in timeLabels" 
          :key="label.text" 
          class="absolute -translate-x-1/2 whitespace-nowrap"
          :style="{ left: label.position + '%' }"
        >
          {{ label.text }}
        </span>
      </div>
    </div>

    <!-- Selection info bar -->
    <div v-if="selection" class="flex items-center justify-between px-4 py-1.5 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-100 dark:border-blue-900/30 text-xs text-blue-800 dark:text-blue-200">
      <span>Sélection: {{ formatDateTime(selection.start) }} → {{ formatDateTime(selection.end) }}</span>
      <button @click="clearSelection" class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors">✕ Effacer</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, reactive, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  range: { start: string; end: string }
  filters: { category: string; level: string; search: string }
  selection: { start: string; end: string } | null
}>()

const emit = defineEmits<{
  'update:selection': [value: { start: string; end: string } | null]
}>()

// Category colors - must match logs.vue
const CATEGORY_COLORS: Record<string, string> = {
  'HARDWARE': '#4f46e5',
  'MQTT': '#ea580c',
  'DB': '#0891b2',
  'API': '#db2777',
  'SYSTEM': '#475569',
  'WEBSOCKET': '#fb923c',
}

interface RawBucket { 
  slot: string
  counts: Record<string, number> 
}

const rawData = ref<RawBucket[]>([])
const containerRef = ref<HTMLElement | null>(null)
const chartRef = ref<HTMLElement | null>(null)

// Drag state
const isDragging = ref(false)
const dragStart = ref<number | null>(null)
const dragEnd = ref<number | null>(null)

// Tooltip
const tooltip = reactive({
  show: false,
  x: 0,
  y: 0,
  time: '',
  total: 0,
  categories: [] as { name: string; color: string; count: number }[]
})

// Computed
const bucketCount = computed(() => rawData.value.length || 1)

const maxCount = computed(() => {
  if (!rawData.value.length) return 100
  return Math.max(...rawData.value.map(b => 
    Object.values(b.counts).reduce((a, c) => a + c, 0)
  ), 1)
})

const buckets = computed(() => {
  return rawData.value.map(bucket => {
    const total = Object.values(bucket.counts).reduce((a, c) => a + c, 0)
    const segments: { color: string; height: number; y: number }[] = []
    
    let y = 0
    // Sort categories for consistent stacking order
    const sortedCategories = Object.entries(bucket.counts)
      .filter(([_, count]) => count > 0)
      .sort(([a], [b]) => a.localeCompare(b))
    
    for (const [category, count] of sortedCategories) {
      const height = (count / maxCount.value) * 95
      segments.push({
        color: CATEGORY_COLORS[category] || '#6b7280',
        height,
        y
      })
      y += height
    }
    
    return {
      slot: bucket.slot,
      total,
      segments
    }
  })
})

const selectionRange = computed(() => {
  if (!props.selection || !rawData.value.length) return null
  
  const selStart = new Date(props.selection.start).getTime()
  const selEnd = new Date(props.selection.end).getTime()
  
  // Find bucket indices by matching timestamps
  // A bucket at index i covers the time from slot[i] to slot[i+1] (or slot[i] + bucketDuration for the last one)
  let startX = 0
  let endX = bucketCount.value
  
  // Get bucket duration
  let bucketDuration = 3600000 // Default 1 hour
  if (rawData.value.length > 1) {
    bucketDuration = new Date(rawData.value[1].slot).getTime() - new Date(rawData.value[0].slot).getTime()
  }
  
  // Find startX: first bucket whose end time is > selStart
  for (let i = 0; i < rawData.value.length; i++) {
    const bucketStart = new Date(rawData.value[i].slot).getTime()
    const bucketEnd = bucketStart + bucketDuration
    
    if (selStart < bucketEnd) {
      // Selection starts within or before this bucket
      const fraction = Math.max(0, (selStart - bucketStart) / bucketDuration)
      startX = i + fraction
      break
    }
  }
  
  // Find endX: last bucket whose start time is < selEnd
  for (let i = rawData.value.length - 1; i >= 0; i--) {
    const bucketStart = new Date(rawData.value[i].slot).getTime()
    const bucketEnd = bucketStart + bucketDuration
    
    if (selEnd > bucketStart) {
      // Selection ends within or after this bucket
      const fraction = Math.min(1, (selEnd - bucketStart) / bucketDuration)
      endX = i + fraction
      break
    }
  }
  
  return { 
    startX: Math.max(0, startX), 
    endX: Math.min(bucketCount.value, endX) 
  }
})

const timeLabels = computed(() => {
  if (!rawData.value.length) return []
  
  const count = rawData.value.length
  const labels: { text: string; position: number }[] = []
  const numLabels = Math.min(8, count)
  
  for (let i = 0; i < numLabels; i++) {
    const idx = Math.floor((i / (numLabels - 1)) * (count - 1))
    const d = new Date(rawData.value[idx].slot)
    
    // Check if range is > 24h
    const rangeMs = new Date(props.range.end).getTime() - new Date(props.range.start).getTime()
    const isMultiDay = rangeMs > 24 * 60 * 60 * 1000
    
    const text = isMultiDay 
      ? d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
      : d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    
    labels.push({ text, position: (idx / (count - 1)) * 100 })
  }
  
  return labels
})

// Methods
const formatNumber = (n: number) => {
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k'
  return n.toString()
}

const formatDateTime = (iso: string) => {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getMouseX = (e: MouseEvent): number => {
  if (!chartRef.value) return 0
  const rect = chartRef.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  return (x / rect.width) * bucketCount.value
}

const xToTime = (x: number): string => {
  if (!rawData.value.length) return new Date().toISOString()
  
  // Clamp x to valid range
  const clampedX = Math.max(0, Math.min(x, bucketCount.value))
  
  // Get bucket index
  const bucketIndex = Math.floor(clampedX)
  const fraction = clampedX - bucketIndex
  
  // Handle edge cases
  if (bucketIndex >= rawData.value.length - 1) {
    // At or past the last bucket - return end of last bucket
    const lastSlot = new Date(rawData.value[rawData.value.length - 1].slot).getTime()
    // Add one bucket duration
    if (rawData.value.length > 1) {
      const secondLastSlot = new Date(rawData.value[rawData.value.length - 2].slot).getTime()
      const bucketDuration = lastSlot - secondLastSlot
      return new Date(lastSlot + bucketDuration * fraction).toISOString()
    }
    return new Date(lastSlot).toISOString()
  }
  
  // Interpolate between current and next bucket
  const currentSlot = new Date(rawData.value[bucketIndex].slot).getTime()
  const nextSlot = new Date(rawData.value[bucketIndex + 1].slot).getTime()
  const time = currentSlot + (nextSlot - currentSlot) * fraction
  
  return new Date(time).toISOString()
}

const startDrag = (e: MouseEvent) => {
  isDragging.value = true
  dragStart.value = getMouseX(e)
  dragEnd.value = dragStart.value
}

const onDrag = (e: MouseEvent) => {
  if (!chartRef.value) return
  
  // Update tooltip
  const rect = chartRef.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const bucketIndex = Math.floor((x / rect.width) * bucketCount.value)
  
  if (bucketIndex >= 0 && bucketIndex < rawData.value.length) {
    const bucket = rawData.value[bucketIndex]
    tooltip.show = true
    tooltip.x = x + 15
    tooltip.y = e.clientY - rect.top - 10
    tooltip.time = new Date(bucket.slot).toLocaleString('fr-FR')
    tooltip.total = Object.values(bucket.counts).reduce((a, c) => a + c, 0)
    tooltip.categories = Object.entries(bucket.counts)
      .filter(([_, count]) => count > 0)
      .map(([name, count]) => ({
        name,
        color: CATEGORY_COLORS[name] || '#6b7280',
        count
      }))
  }
  
  // Update drag
  if (isDragging.value) {
    dragEnd.value = getMouseX(e)
  }
}

const endDrag = (e: MouseEvent) => {
  tooltip.show = false
  
  if (!isDragging.value || dragStart.value === null || dragEnd.value === null) {
    isDragging.value = false
    return
  }
  
  isDragging.value = false
  
  const start = Math.min(dragStart.value, dragEnd.value)
  const end = Math.max(dragStart.value, dragEnd.value)
  
  // Minimum drag threshold (at least 0.5 bucket width)
  if (end - start < 0.5) {
    // Click = clear selection
    emit('update:selection', null)
  } else {
    // Drag = create selection
    const startTime = xToTime(start)
    const endTime = xToTime(end)
    emit('update:selection', { start: startTime, end: endTime })
  }
  
  dragStart.value = null
  dragEnd.value = null
}

const clearSelection = () => {
  emit('update:selection', null)
}

const fetchHistogram = async () => {
  if (!props.range.start || !props.range.end) return
  
  try {
    const params = new URLSearchParams({
      startDate: props.range.start,
      endDate: props.range.end,
    })
    
    if (props.filters.category) {
      props.filters.category.split(',').filter(Boolean).forEach(cat => params.append('category', cat))
    }
    if (props.filters.level) {
      props.filters.level.split(',').filter(Boolean).forEach(lvl => params.append('level', lvl))
    }
    if (props.filters.search) params.append('search', props.filters.search)
    
    const data = await $fetch<RawBucket[]>(`/api/logs/histogram?${params}`)
    rawData.value = data
  } catch (e) {
    console.error('Failed to fetch histogram:', e)
  }
}

watch(() => [props.range, props.filters], fetchHistogram, { deep: true, immediate: true })
</script>

<style scoped>
.histogram-wrapper { 
  background: white;
  border-bottom: 1px solid #e5e7eb;
}

.histogram-container {
  display: grid;
  grid-template-columns: 40px 1fr;
  grid-template-rows: 100px 24px;
  padding: 12px 16px 4px 8px;
}

.y-axis {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  font-size: 10px;
  color: #9ca3af;
  text-align: right;
  padding-right: 6px;
  padding-top: 2px;
  padding-bottom: 2px;
}

.chart-area {
  position: relative;
  cursor: crosshair;
  background: #f9fafb;
  border-radius: 4px;
}

.chart-area svg {
  display: block;
}

.x-axis {
  grid-column: 2;
  position: relative;
  font-size: 10px;
  color: #9ca3af;
  height: 20px;
}

.x-axis span {
  position: absolute;
  transform: translateX(-50%);
  white-space: nowrap;
}

.tooltip {
  position: absolute;
  background: #1f2937;
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 11px;
  pointer-events: none;
  z-index: 50;
  min-width: 120px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}

.tooltip-time {
  font-weight: 500;
  margin-bottom: 4px;
  padding-bottom: 4px;
  border-bottom: 1px solid #374151;
}

.tooltip-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 2px 0;
}

.tooltip-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.tooltip-total {
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px solid #374151;
  font-weight: 500;
}

.selection-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 16px;
  background: #eff6ff;
  border-top: 1px solid #bfdbfe;
  font-size: 12px;
  color: #1e40af;
}

.clear-btn {
  background: none;
  border: none;
  color: #1e40af;
  cursor: pointer;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
}

.clear-btn:hover {
  background: #dbeafe;
}
</style>
