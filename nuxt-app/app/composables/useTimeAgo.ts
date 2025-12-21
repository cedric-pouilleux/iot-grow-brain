import { computed, ref, onMounted, onUnmounted } from 'vue'
import { formatTimeAgo } from '~/utils/time'

/**
 * Composable simple pour calculer le temps écoulé depuis une date
 * Se met à jour automatiquement toutes les secondes
 */
export function useTimeAgo(date: () => Date | string | null | undefined) {
  const now = ref(Date.now())
  let interval: ReturnType<typeof setInterval> | null = null

  const timeAgo = computed(() => {
    now.value // Utiliser now pour déclencher la réactivité
    const dateValue = date()
    if (!dateValue) return ''
    return formatTimeAgo(dateValue)
  })

  onMounted(() => {
    interval = setInterval(() => {
      now.value = Date.now()
    }, 1000)
  })

  onUnmounted(() => {
    if (interval) clearInterval(interval)
  })

  return timeAgo
}
