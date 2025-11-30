/**
 * Formate une valeur numérique pour l'affichage
 */
export function formatValue(val: number | null | undefined): string {
  if (val === null || val === undefined) return '--'
  const num = parseFloat(String(val))
  if (Number.isInteger(num)) return num.toString()
  return num.toFixed(1).replace(/\.0$/, '')
}

/**
 * Formate une taille en bytes
 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return Math.round(bytes) + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
}
