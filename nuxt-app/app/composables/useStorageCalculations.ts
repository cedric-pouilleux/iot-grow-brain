import type { DeviceStatus } from '../types'
import { calculateFlashPercentages, calculateRamPercentages } from '../utils/storage'
import type { FlashPercentages, RamPercentages } from '../utils/storage'

/**
 * Composable for calculating storage and memory usage
 * Provides computed properties for flash and RAM percentages
 * @param deviceStatus - Reactive device status ref
 * @returns Computed storage calculations
 */
export function useStorageCalculations(deviceStatus: Ref<DeviceStatus | null>) {
  const flashPercentages = computed<FlashPercentages>(() => {
    return calculateFlashPercentages(
      deviceStatus.value?.system?.flash,
      deviceStatus.value?.hardware?.chip
    )
  })

  const ramPercentages = computed<RamPercentages>(() => {
    return calculateRamPercentages(deviceStatus.value?.system?.memory)
  })

  return {
    flashPercentages,
    ramPercentages,
  }
}
