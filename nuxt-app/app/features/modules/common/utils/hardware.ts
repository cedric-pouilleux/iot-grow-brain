import type { ChipInfo } from '../types'

/**
 * Get formatted hardware model string with revision
 * @param chip - Chip information from device status
 * @returns Formatted model string (e.g., "ESP32-S3 [Rev 1]")
 */
export function getHardwareModel(chip: ChipInfo | undefined): string {
  const model = chip?.model || '--'
  const rev = chip?.rev

  if (rev !== undefined) {
    return `${model} [Rev ${rev}]`
  }

  return model
}

/**
 * Get WiFi icon name based on signal strength
 * @param rssi - Signal strength in dBm
 * @returns Tabler icon name
 */
export function getWifiIcon(rssi: number | null | undefined): string {
  if (!rssi) return 'tabler:wifi-off'
  if (rssi > -60) return 'tabler:wifi'
  if (rssi > -75) return 'tabler:wifi-2'
  if (rssi > -85) return 'tabler:wifi-1'
  return 'tabler:wifi-0'
}

/**
 * Get WiFi signal strength CSS class based on RSSI
 * @param rssi - Signal strength in dBm
 * @returns Tailwind CSS color class
 */
export function getWifiClass(rssi: number | null | undefined): string {
  if (!rssi) return 'text-gray-400'
  if (rssi > -50) return 'text-green-600' // Excellent
  if (rssi > -60) return 'text-green-500' // Very good
  if (rssi > -70) return 'text-yellow-500' // Good
  if (rssi > -80) return 'text-orange-500' // Fair
  return 'text-red-500' // Poor
}
