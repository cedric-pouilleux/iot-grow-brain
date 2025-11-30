import type { DashboardData, DeviceStatus } from '../types'
import { processSensorData } from '../utils/data-processing'

export const useDashboard = () => {
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const loadDashboard = async (
    moduleId: string,
    days: number = 1
  ): Promise<{ status: DeviceStatus | null; sensors: any } | null> => {
    if (!moduleId) return null

    isLoading.value = true
    error.value = null

    try {
      const dashboardData = await $fetch<DashboardData>(
        `/api/dashboard?module=${moduleId}&days=${days}&_t=${Date.now()}`
      )

      return {
        status: dashboardData.status,
        sensors: {
          co2: processSensorData(dashboardData.sensors?.co2 || []),
          temp: processSensorData(dashboardData.sensors?.temp || []),
          hum: processSensorData(dashboardData.sensors?.hum || [])
        }
      }
    } catch (e: any) {
      error.value = `Erreur lors du chargement: ${e.message || 'Erreur inconnue'}`
      console.error('Erreur fetch dashboard:', e)
      return null
    } finally {
      isLoading.value = false
    }
  }

  return {
    isLoading: readonly(isLoading),
    error: readonly(error),
    loadDashboard
  }
}

