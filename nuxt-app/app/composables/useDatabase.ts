/**
 * Composable pour gérer la logique de la base de données
 * (extrait de app.vue pour améliorer la lisibilité)
 */
import type { DbSize } from '../types'

export const useDatabase = () => {
  const dbSize = ref<DbSize | null>(null)
  const metricsHistory = ref<any[]>([])

  /**
   * Charge la taille de la base de données
   */
  const loadDbSize = async () => {
    try {
      const dbSizeData = await $fetch<DbSize>('/api/db-size', { timeout: 5000 })
      dbSize.value = dbSizeData
    } catch (e) {
      console.error("Erreur fetch db-size:", e)
    }
  }

  /**
   * Charge l'historique des métriques
   */
  const loadMetricsHistory = async (days: number = 30) => {
    try {
      const data = await $fetch('/api/metrics-history', { 
        params: { days },
        timeout: 10000 
      })
      metricsHistory.value = data.history || []
    } catch (e) {
      console.error("Erreur fetch metrics-history:", e)
    }
  }

  return {
    dbSize: readonly(dbSize),
    metricsHistory: readonly(metricsHistory),
    loadDbSize,
    loadMetricsHistory
  }
}

