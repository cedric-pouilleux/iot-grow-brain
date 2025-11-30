import { format, isValid, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

/**
 * Formate un temps en secondes en format lisible (heures et minutes)
 * @param seconds - Le nombre de secondes à formater
 * @returns Une chaîne formatée comme "5h 30m" ou "--" si invalide
 */
export function formatUptime(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || seconds < 0) return '--'

  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}h ${m}m`
}

/**
 * Formate le temps écoulé depuis une date
 * Utilise l'API native Intl.RelativeTimeFormat pour un formatage localisé
 * @param date - La date de référence
 * @returns Une chaîne formatée comme "il y a 5 secondes", "il y a 2 minutes", etc.
 */
export function formatTimeAgo(date: Date | string | null | undefined): string {
  if (!date) return ''

  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date

    if (!isValid(dateObj)) return ''

    const diff = (Date.now() - dateObj.getTime()) / 1000

    if (Math.abs(diff) < 5) return "À l'instant"

    const units: [Intl.RelativeTimeFormatUnit, number][] = [
      ['year', 60 * 60 * 24 * 365],
      ['month', 60 * 60 * 24 * 30],
      ['week', 60 * 60 * 24 * 7],
      ['day', 60 * 60 * 24],
      ['hour', 60 * 60],
      ['minute', 60],
      ['second', 1],
    ]

    const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' })

    for (const [unit, secondsInUnit] of units) {
      if (Math.abs(diff) >= secondsInUnit || unit === 'second') {
        const value = Math.round(diff / secondsInUnit)
        return rtf.format(-value, unit)
      }
    }

    return format(dateObj, 'HH:mm', { locale: fr })
  } catch (error) {
    return ''
  }
}

/**
 * Formate une date en HH:MM ou HH:MM:SS
 * Utilise date-fns pour un formatage propre
 */
export function formatTime(date: Date | string | number): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d)
}
