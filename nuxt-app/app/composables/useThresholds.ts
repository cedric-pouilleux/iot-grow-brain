/**
 * useThresholds
 * 
 * Composable providing health-based threshold evaluation for air quality sensors.
 * Thresholds are based on OMS/EPA guidelines for human health.
 * 
 * Supported sensors: CO2, TVOC, VOC, eCO2, PM2.5, PM10, Humidity
 */

// ============================================================================
// Types
// ============================================================================

export type ThresholdLevel = 'good' | 'moderate' | 'poor' | 'hazardous'

export interface ThresholdResult {
  level: ThresholdLevel
  label: string
  textClass: string
  bgClass: string
}

interface ThresholdDefinition {
  good: number      // below this = good
  moderate: number  // below this = moderate
  poor: number      // below this = poor
  // above poor = hazardous
}

// ============================================================================
// Threshold Definitions (OMS/EPA standards)
// ============================================================================

const THRESHOLDS: Record<string, ThresholdDefinition> = {
  // CO2: OMS recommendations for indoor air
  co2: { good: 800, moderate: 1000, poor: 1500 },
  eco2: { good: 800, moderate: 1000, poor: 1500 },
  
  // CO: WHO guidelines for carbon monoxide (8h exposure)
  co: { good: 9, moderate: 35, poor: 100 },
  
  // TVOC: German Federal Environment Agency (UBA)
  tvoc: { good: 220, moderate: 660, poor: 2200 },
  
  // VOC Index (SGP40): 0-500 scale, 100 = clean air reference
  voc: { good: 150, moderate: 250, poor: 400 },
  
  // Humidity: optimal 30-60%, uncomfortable outside this range
  // All humidity sensor aliases (DHT22: humidity/hum, SHT31: hum_sht)
  humidity: { good: 60, moderate: 70, poor: 80 },
  hum: { good: 60, moderate: 70, poor: 80 },
  humsht: { good: 60, moderate: 70, poor: 80 },
  
  // PM2.5: EPA AQI breakpoints (µg/m³, 24h average)
  pm25: { good: 12, moderate: 35, poor: 55 },
  'pm2.5': { good: 12, moderate: 35, poor: 55 },
  
  // PM10: EPA AQI breakpoints (µg/m³, 24h average)
  pm10: { good: 54, moderate: 154, poor: 254 },
}

// ============================================================================
// Level Configuration
// ============================================================================

const LEVEL_CONFIG: Record<ThresholdLevel, Omit<ThresholdResult, 'level'>> = {
  good: {
    label: 'Bon',
    textClass: 'text-white',
    bgClass: 'bg-emerald-500',
  },
  moderate: {
    label: 'Modéré',
    textClass: 'text-white',
    bgClass: 'bg-amber-500',
  },
  poor: {
    label: 'Élevé',
    textClass: 'text-white',
    bgClass: 'bg-orange-500',
  },
  hazardous: {
    label: 'Dangereux',
    textClass: 'text-white',
    bgClass: 'bg-red-500',
  },
}

// ============================================================================
// Composable
// ============================================================================

export function useThresholds() {
  /**
   * Evaluate a sensor value against health thresholds
   * Returns null if no threshold is defined for this sensor
   */
  const evaluateThreshold = (sensorKey: string, value?: number): ThresholdResult | null => {
    if (value === undefined || value === null) return null
    
    // Normalize sensor key
    const key = sensorKey.toLowerCase().replace(/[_-]/g, '')
    
    // Find matching threshold
    const threshold = THRESHOLDS[key]
    if (!threshold) return null
    
    // Determine level
    let level: ThresholdLevel
    if (value < threshold.good) {
      level = 'good'
    } else if (value < threshold.moderate) {
      level = 'moderate'
    } else if (value < threshold.poor) {
      level = 'poor'
    } else {
      level = 'hazardous'
    }
    
    return {
      level,
      ...LEVEL_CONFIG[level],
    }
  }
  
  /**
   * Check if a sensor has threshold definitions
   */
  const hasThreshold = (sensorKey: string): boolean => {
    const key = sensorKey.toLowerCase().replace(/[_-]/g, '')
    return key in THRESHOLDS
  }
  
  /**
   * Get threshold color for a sensor value (hex format for charts)
   * Returns null if value is 'good' or no threshold defined
   */
  const getThresholdColor = (sensorKey: string, value?: number): string | null => {
    const result = evaluateThreshold(sensorKey, value)
    if (!result || result.level === 'good') return null
    
    // Return hex colors for chart rendering
    const colors: Record<ThresholdLevel, string> = {
      good: '#10b981',    // emerald-500
      moderate: '#f59e0b', // amber-500
      poor: '#f97316',     // orange-500
      hazardous: '#ef4444', // red-500
    }
    return colors[result.level]
  }
  
  /**
   * Get threshold definition for a sensor
   */
  const getThresholdDefinition = (sensorKey: string): ThresholdDefinition | null => {
    const key = sensorKey.toLowerCase().replace(/[_-]/g, '')
    return THRESHOLDS[key] || null
  }
  
  return {
    evaluateThreshold,
    hasThreshold,
    getThresholdColor,
    getThresholdDefinition,
  }
}
