<template>
  <div class="min-h-screen bg-gray-100 text-gray-800 p-4 sm:p-8">
    <div class="max-w-6xl mx-auto">
      <header class="text-center mb-10">
        <h1 class="text-4xl font-bold text-gray-900 mb-2">🏠 IoT Dashboard</h1>
        <p class="text-gray-500">Surveillance en temps réel</p>
      </header>

      <main>
        <ClientOnly>
          <!-- Grille des cartes -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <SensorCard 
              title="CO2" 
              :value="lastCo2?.value" 
              unit="ppm" 
              color="emerald" 
              :date="lastCo2?.time"
            />
            <SensorCard 
              title="Température" 
              :value="lastTemp?.value" 
              unit="°C" 
              color="orange" 
              :date="lastTemp?.time"
            />
            <SensorCard 
              title="Humidité" 
              :value="lastHum?.value" 
              unit="%" 
              color="blue" 
              :date="lastHum?.time"
            />
          </div>

          <!-- Grille des graphiques -->
          <div class="grid grid-cols-1 gap-6">
            <SensorChart 
              title="CO2" 
              :data="sensorData?.co2" 
              :loading="pending" 
              color="#10b981" 
              colorRgba="rgba(16, 185, 129, 0.2)"
              titleColorClass="text-emerald-600"
            />
            
            <SensorChart 
              title="Température" 
              :data="sensorData?.temp" 
              :loading="pending" 
              color="#f97316" 
              colorRgba="rgba(249, 115, 22, 0.2)"
              titleColorClass="text-orange-500"
            />

            <SensorChart 
              title="Humidité" 
              :data="sensorData?.hum" 
              :loading="pending" 
              color="#3b82f6" 
              colorRgba="rgba(59, 130, 246, 0.2)"
              titleColorClass="text-blue-500"
              :yMin="0"
              :yMax="100"
            />
          </div>
          
          <!-- Fallback pour le SSR -->
          <template #fallback>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div v-for="i in 3" :key="i" class="bg-white rounded-2xl shadow-sm p-6 min-h-[200px] animate-pulse"></div>
            </div>
            <div class="grid grid-cols-1 gap-6">
              <div v-for="i in 3" :key="i" class="bg-white rounded-2xl shadow-sm p-6 min-h-[300px] animate-pulse"></div>
            </div>
          </template>
        </ClientOnly>
      </main>
    </div>
  </div>
</template>

<script setup>
import SensorCard from '../components/SensorCard.vue'
import SensorChart from '../components/SensorChart.vue'

// --- Data Fetching ---
const { data: sensorData, pending, refresh } = await useAsyncData(
  'sensors',
  async () => {
    const [co2, temp, hum] = await Promise.all([
      $fetch(`/api/measurements?type=co2&days=1&_t=${Date.now()}`),
      $fetch(`/api/measurements?type=temperature&days=1&_t=${Date.now()}`),
      $fetch(`/api/measurements?type=humidity&days=1&_t=${Date.now()}`)
    ])
    return { co2, temp, hum }
  },
  {
    server: false,
    lazy: true,
    transform: (data) => {
      const process = (arr) => {
        if (!arr) return []
        // 1. Tri chronologique
        const sorted = arr.map(m => ({ ...m, time: new Date(m.time) })).reverse();
        
        // 2. Insertion de "trous" si écart > 5 min (300 000 ms)
        const MAX_GAP = 5 * 60 * 1000; 
        const result = [];

        for (let i = 0; i < sorted.length; i++) {
          const current = sorted[i];
          result.push(current);

          if (i < sorted.length - 1) {
            const next = sorted[i + 1];
            const diff = next.time - current.time;
            
            if (diff > MAX_GAP) {
              // Ajout d'un point null pour couper la ligne
              // Important: On met le temps au milieu du gap
              result.push({
                time: new Date(current.time.getTime() + 1000), // Juste après
                value: null
              });
            }
          }
        }
        return result;
      }

      return {
        co2: process(data.co2 || []),
        temp: process(data.temp || []),
        hum: process(data.hum || [])
      }
    },
    watch: false
  }
)

// --- Computed Helpers ---
const lastCo2 = computed(() => {
  const arr = sensorData.value?.co2;
  if (!arr) return null;
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i].value !== null) return arr[i];
  }
  return null;
})
const lastTemp = computed(() => {
  const arr = sensorData.value?.temp;
  if (!arr) return null;
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i].value !== null) return arr[i];
  }
  return null;
})
const lastHum = computed(() => {
  const arr = sensorData.value?.hum;
  if (!arr) return null;
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i].value !== null) return arr[i];
  }
  return null;
})

// --- Auto-refresh ---
let interval
onMounted(() => {
  interval = setInterval(() => refresh(), 30000)
})

onUnmounted(() => {
  if (interval) clearInterval(interval)
})
</script>
