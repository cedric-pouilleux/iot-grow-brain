/**
 * useChartSettings
 * 
 * Composable for managing chart display preferences.
 * Settings are persisted in localStorage.
 */

const STORAGE_KEY = 'iot-chart-settings'

interface ChartSettings {
  showCharts: boolean
  showThresholdLines: boolean
  colorThresholds: boolean
  showAlertThresholds: boolean
}

const defaultSettings: ChartSettings = {
  showCharts: true,
  showThresholdLines: false,
  colorThresholds: true,
  showAlertThresholds: true
}

// Global reactive settings
const settings = ref<ChartSettings>({ ...defaultSettings })

// Load settings from localStorage on init
const loadSettings = () => {
  if (import.meta.client) {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        settings.value = { ...defaultSettings, ...JSON.parse(stored) }
      }
    } catch (e) {
      console.warn('Failed to load chart settings:', e)
    }
  }
}

// Save settings to localStorage
const saveSettings = () => {
  if (import.meta.client) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings.value))
    } catch (e) {
      console.warn('Failed to save chart settings:', e)
    }
  }
}

// Init on module load
loadSettings()

export function useChartSettings() {
  const showCharts = computed({
    get: () => settings.value.showCharts,
    set: (value: boolean) => {
      settings.value.showCharts = value
      saveSettings()
    }
  })

  const showThresholdLines = computed({
    get: () => settings.value.showThresholdLines,
    set: (value: boolean) => {
      settings.value.showThresholdLines = value
      saveSettings()
    }
  })

  const colorThresholds = computed({
    get: () => settings.value.colorThresholds,
    set: (value: boolean) => {
      settings.value.colorThresholds = value
      saveSettings()
    }
  })

  const showAlertThresholds = computed({
    get: () => settings.value.showAlertThresholds,
    set: (value: boolean) => {
      settings.value.showAlertThresholds = value
      saveSettings()
    }
  })

  const toggleShowCharts = () => {
    showCharts.value = !showCharts.value
  }

  const toggleThresholdLines = () => {
    showThresholdLines.value = !showThresholdLines.value
  }

  const toggleColorThresholds = () => {
    colorThresholds.value = !colorThresholds.value
  }

  const toggleAlertThresholds = () => {
    showAlertThresholds.value = !showAlertThresholds.value
  }

  return {
    showCharts,
    showThresholdLines,
    colorThresholds,
    showAlertThresholds,
    toggleShowCharts,
    toggleThresholdLines,
    toggleColorThresholds,
    toggleAlertThresholds
  }
}
