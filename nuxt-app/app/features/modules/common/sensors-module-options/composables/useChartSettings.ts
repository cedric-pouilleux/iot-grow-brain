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
  minimalMode: boolean
  graphDuration: string
  useFixedScale: boolean
}

const defaultSettings: ChartSettings = {
  showCharts: true,
  showThresholdLines: false,
  colorThresholds: true,
  showAlertThresholds: true,
  minimalMode: false,
  graphDuration: '24h',
  useFixedScale: false
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
    get: () => true, // Always show charts in normal mode
    set: () => {} // No-op
  })

  const showThresholdLines = computed({
    get: () => false, // Feature removed
    set: () => {} // No-op
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

  const minimalMode = computed({
    get: () => settings.value.minimalMode,
    set: (value: boolean) => {
      settings.value.minimalMode = value
      saveSettings()
    }
  })

  const graphDuration = computed({
    get: () => settings.value.graphDuration,
    set: (value: string) => {
      settings.value.graphDuration = value
      saveSettings()
    }
  })

  const useFixedScale = computed({
    get: () => settings.value.useFixedScale,
    set: (value: boolean) => {
      settings.value.useFixedScale = value
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

  const toggleMinimalMode = () => {
    minimalMode.value = !minimalMode.value
  }
  
  const toggleFixedScale = () => {
    useFixedScale.value = !useFixedScale.value
  }

  return {
    showCharts,
    showThresholdLines,
    colorThresholds,
    showAlertThresholds,
    minimalMode,
    graphDuration,
    useFixedScale,
    toggleShowCharts,
    toggleThresholdLines,
    toggleColorThresholds,
    toggleAlertThresholds,
    toggleMinimalMode,
    toggleFixedScale
  }
}
