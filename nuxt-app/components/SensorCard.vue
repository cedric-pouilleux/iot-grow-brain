<template>
  <div class="h-full">
    <div v-if="value !== null && value !== undefined" class="bg-white rounded-2xl shadow-sm p-6 flex flex-col items-center justify-center text-center relative overflow-hidden border border-gray-100 min-h-[200px] h-full">
      <div :class="['absolute top-0 left-0 w-full h-1', colorClasses.bg]"></div>
      
      <h2 class="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">{{ title }}</h2>
      
      <div class="flex items-baseline gap-1 my-auto">
        <span :class="['text-5xl font-black', colorClasses.text]">{{ value }}</span>
        <span class="text-xl text-gray-400">{{ unit }}</span>
      </div>
      
      <div class="text-xs text-gray-400 mt-4">
        <ClientOnly>
          {{ formattedDate }}
          <template #fallback>--:--</template>
        </ClientOnly>
      </div>
    </div>

    <div v-else class="bg-white rounded-2xl shadow-sm p-6 min-h-[200px] animate-pulse flex items-center justify-center h-full">
      <div class="flex flex-col items-center gap-4">
        <div class="h-4 w-20 bg-gray-200 rounded"></div>
        <div class="h-12 w-24 bg-gray-200 rounded"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  title: String,
  value: [Number, String],
  unit: String,
  date: [Date, String],
  color: {
    type: String,
    default: 'emerald',
    validator: (value) => ['emerald', 'orange', 'blue'].includes(value)
  }
})

const colorMap = {
  emerald: { bg: 'bg-emerald-500', text: 'text-emerald-600' },
  orange:  { bg: 'bg-orange-500',  text: 'text-orange-500' },
  blue:    { bg: 'bg-blue-500',    text: 'text-blue-500' }
}

const colorClasses = computed(() => colorMap[props.color] || colorMap.emerald)

const formattedDate = computed(() => {
  if (!props.date) return ''
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit', minute: '2-digit'
    }).format(new Date(props.date))
  } catch (e) {
    return ''
  }
})
</script>
