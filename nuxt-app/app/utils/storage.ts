import type { DeviceStatus, FlashInfo, ChipInfo, SystemMemory } from '../types'

/**
 * Storage calculation results for flash memory
 */
export interface FlashPercentages {
  sketchPercent: number
  otaPercent: number
  systemPercent: number
  freePercent: number
  totalUsedKb: number
  freeSpaceKb: number
}

/**
 * Storage calculation results for RAM
 */
export interface RamPercentages {
  usedPercent: number
  freePercent: number
  usedKb: number
}

/**
 * Calculate flash memory usage percentages and sizes
 * @param flash - Flash information from device status
 * @param chip - Chip information from device status
 * @returns Flash usage percentages and sizes
 */
export function calculateFlashPercentages(
  flash: FlashInfo | undefined,
  chip: ChipInfo | undefined
): FlashPercentages {
  const total = chip?.flashKb || 0
  const used = flash?.usedKb || 0
  const ota = flash?.freeKb || 0
  const sys = flash?.systemKb || 0

  if (total === 0) {
    return {
      sketchPercent: 0,
      otaPercent: 0,
      systemPercent: 0,
      freePercent: 0,
      totalUsedKb: 0,
      freeSpaceKb: 0,
    }
  }

  const totalUsed = used + sys + ota
  const freeSpace = total - totalUsed

  return {
    sketchPercent: (used / total) * 100,
    otaPercent: (ota / total) * 100,
    systemPercent: (sys / total) * 100,
    freePercent: freeSpace > 0 ? (freeSpace / total) * 100 : 0,
    totalUsedKb: totalUsed,
    freeSpaceKb: freeSpace,
  }
}

/**
 * Calculate RAM usage percentages and sizes
 * @param memory - Memory information from device status
 * @returns RAM usage percentages and sizes
 */
export function calculateRamPercentages(memory: SystemMemory | undefined): RamPercentages {
  const total = memory?.heapTotalKb || 0
  const free = memory?.heapFreeKb ?? 0

  if (total === 0) {
    return {
      usedPercent: 0,
      freePercent: 0,
      usedKb: 0,
    }
  }

  const used = total - free

  return {
    usedPercent: (used / total) * 100,
    freePercent: (free / total) * 100,
    usedKb: used,
  }
}

/**
 * Calculate estimated storage requirements
 * @param sensorIntervals - Sensor refresh intervals in seconds
 * @param years - Number of years to calculate for
 * @param compressed - Whether to apply compression factor
 * @returns Estimated storage in bytes
 */
export function calculateStoragePrediction(
  sensorIntervals: { co2: number; temperature: number; humidity: number },
  years: number,
  compressed: boolean
): number {
  const secondsPerYear = 365 * 24 * 3600
  const bytesPerRecord = 37

  const recordsCo2 = secondsPerYear / sensorIntervals.co2
  const recordsTemp = secondsPerYear / sensorIntervals.temperature
  const recordsHum = secondsPerYear / sensorIntervals.humidity

  const totalRecords = (recordsCo2 + recordsTemp + recordsHum) * years
  const totalBytes = totalRecords * bytesPerRecord

  return compressed ? totalBytes * 0.1 : totalBytes
}
