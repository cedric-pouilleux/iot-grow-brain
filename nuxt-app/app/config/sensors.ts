/**
 * Sensor Configuration
 * 
 * Ce fichier contient les configurations des capteurs pour l'affichage
 * des graphiques et le calcul des seuils.
 */

export interface SensorRange {
  min: number
  max: number
}

/**
 * Plages min/max fixes pour chaque type de capteur.
 * Utilisées pour l'axe Y des graphiques.
 */
export const sensorRanges: Record<string, SensorRange> = {
  // ============================================================================
  // Température (-10°C à 50°C)
  // ============================================================================
  temperature: { min: -10, max: 50 },
  temperature_bmp: { min: -10, max: 50 },
  temp_sht: { min: -10, max: 50 },
  temp: { min: -10, max: 50 },

  // ============================================================================
  // Humidité (0% à 100%)
  // ============================================================================
  humidity: { min: 0, max: 100 },
  hum_sht: { min: 0, max: 100 },
  hum: { min: 0, max: 100 },

  // ============================================================================
  // CO2 (0 à 10000 ppm)
  // ============================================================================
  co2: { min: 0, max: 10000 },
  eco2: { min: 0, max: 10000 },

  // ============================================================================
  // COV / TCOV - Graphiques séparés (pas de combinaison)
  // - VOC (SGP40): 0 à 500 (index de qualité)
  // - TVOC (SGP30): 0 à 5000 ppb
  // ============================================================================
  voc: { min: 0, max: 500 },
  tvoc: { min: 0, max: 5000 },

  // ============================================================================
  // Pression atmosphérique (300 à 1100 hPa)
  // ============================================================================
  pressure: { min: 300, max: 1100 },

  // ============================================================================
  // Particules fines - PM (0 à 3000 µg/m³)
  // ============================================================================
  pm1: { min: 0, max: 3000 },
  pm25: { min: 0, max: 3000 },
  pm4: { min: 0, max: 3000 },
  pm10: { min: 0, max: 3000 },

  // ============================================================================
  // Monoxyde de carbone - CO (0 à 1000 ppm)
  // ============================================================================
  co: { min: 0, max: 1000 },
}

/**
 * Ratio de normalisation pour combiner des capteurs sur le même graphique.
 * Note: TVOC et VOC utilisent maintenant des graphiques séparés (ratio = 1)
 */
export const normalizationRatios: Record<string, number> = {
  // Pas de normalisation - graphiques séparés
}

/**
 * Récupère le ratio de normalisation pour un capteur.
 */
export function getNormalizationRatio(sensorKey: string): number {
  return normalizationRatios[sensorKey.toLowerCase()] || 1
}

/**
 * Récupère la plage min/max pour un capteur.
 */
export function getSensorRange(sensorKey: string): SensorRange | null {
  return sensorRanges[sensorKey.toLowerCase()] || null
}
