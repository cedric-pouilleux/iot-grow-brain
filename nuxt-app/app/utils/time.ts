/**
 * Formate un temps en secondes en format lisible (heures et minutes)
 * @param seconds - Le nombre de secondes à formater
 * @returns Une chaîne formatée comme "5h 30m" ou "--" si invalide
 */
export function formatUptime(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return '--'
  if (seconds < 0) return '--'
  
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}h ${m}m`
}

