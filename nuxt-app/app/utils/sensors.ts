/**
 * Type pour les types de capteurs supportés
 */
export type SensorType =
  | 'co2'
  | 'temperature'
  | 'temp'
  | 'humidity'
  | 'hum'
  | 'pm25'
  | 'voc'
  | 'pressure'
  | 'temperature_bmp'

/**
 * Obtient le label affiché pour un type de capteur
 * @param type - Le type de capteur
 * @returns Le label correspondant
 */
export function getSensorLabel(type: string): string {
  const map: Record<string, string> = {
    co2: 'CO2',
    temperature: 'Température',
    temperature_bmp: 'Temp BMP',
    temp: 'Température',
    humidity: 'Humidité',
    hum: 'Humidité',
    pm1: 'PM1.0',
    pm25: 'PM2.5',
    pm4: 'PM4.0',
    pm10: 'PM10.0',
    voc: 'COV',
    pressure: 'Pression',
  }
  return map[type] || type
}

/**
 * Obtient la couleur hexadécimale pour un type de capteur
 * @param type - Le type de capteur
 * @returns La couleur hexadécimale correspondante
 */
export function getSensorColor(type: string): string {
  const map: Record<string, string> = {
    co2: '#10b981',
    temperature: '#f97316',
    temperature_bmp: '#ea580c', // Darker orange
    temp: '#f97316',
    humidity: '#3b82f6',
    hum: '#3b82f6',
    pm1: '#8b5cf6',
    pm25: '#8b5cf6',
    pm4: '#7c3aed',
    pm10: '#7c3aed',
    voc: '#ec4899',
    pressure: '#06b6d4',
  }
  return map[type] || '#9ca3af'
}

/**
 * Obtient l'unité de mesure pour un type de capteur
 * @param type - Le type de capteur
 * @returns L'unité correspondante
 */
export function getSensorUnit(type: string): string {
  const unitMap: Record<string, string> = {
    co2: 'ppm',
    temperature: '°C',
    temperature_bmp: '°C',
    temp: '°C',
    humidity: '%',
    hum: '%',
    pm1: 'µg/m³',
    pm25: 'µg/m³',
    pm4: 'µg/m³',
    pm10: 'µg/m³',
    voc: 'ppb',
    pressure: 'hPa',
  }
  return unitMap[type] || ''
}

/**
 * Normalise un type de capteur (temperature -> temp, humidity -> hum)
 * @param sensorType - Le type de capteur à normaliser
 * @returns Le type normalisé
 */
export function normalizeSensorType(sensorType: string): string {
  if (sensorType === 'temperature') return 'temp'
  if (sensorType === 'humidity') return 'hum'
  return sensorType
}
