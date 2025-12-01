/**
 * Format utilities for displaying data in the UI
 */

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
 * Format a number with thousand separators
 * @param value - Number to format
 * @returns Formatted string with spaces as thousand separators
 */
export function formatNumber(value: number): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

/**
 * Format a percentage value
 * @param value - Percentage value (0-100)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`
}

/**
 * Format file size from kilobytes to human-readable format
 * @param kb - Size in kilobytes
 * @returns Formatted size string (e.g., "1.5 MB", "512 KB")
 */
export function formatSize(kb: number | undefined | null): string {
  if (kb === null || kb === undefined) return '--'
  if (kb < 1024) return kb + ' KB'
  if (kb < 1024 * 1024) return (kb / 1024).toFixed(1) + ' MB'
  return (kb / (1024 * 1024)).toFixed(2) + ' GB'
}
