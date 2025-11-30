/**
 * Composable pour gérer la logique de la base de données
 * (extrait de app.vue pour améliorer la lisibilité)
 */
import type { GetApiDbSize200, GetApiMetricsHistory200HistoryItem } from '../utils/model'
import { getApiDbSize, getApiMetricsHistory } from '../utils/api'

export const useDatabase = () => {
  const dbSize = ref<GetApiDbSize200 | null>(null)
  const metricsHistory = ref<GetApiMetricsHistory200HistoryItem[]>([])

  /**
   * Charge la taille de la base de données
   */
  const loadDbSize = async () => {
    try {
      const response = await getApiDbSize()
      if (response.data) {
        dbSize.value = response.data
      }
    } catch (e) {
      console.error('Erreur fetch db-size:', e)
    }
  }

  /**
   * Charge l'historique des métriques
   */
  const loadMetricsHistory = async (days: number = 30) => {
    try {
      const response = await getApiMetricsHistory({ days: days.toString() })
      if (response.data && response.data.history) {
        metricsHistory.value = response.data.history
      }
    } catch (e) {
      console.error('Erreur fetch metrics-history:', e)
    }
  }

  return {
    dbSize: readonly(dbSize),
    metricsHistory: readonly(metricsHistory),
    loadDbSize,
    loadMetricsHistory,
  }
}
