/**
 * Sensor utilities
 * Uses canonical sensor keys from config/sensors.ts
 */

import { getSensor, type SensorKey, SENSORS } from '../config/sensors'

/**
 * Type pour les types de capteurs supportés (12 canonical keys)
 */
export type SensorType = SensorKey

/**
 * Obtient le label affiché pour un type de capteur
 */
export function getSensorLabel(type: string): string {
  return getSensor(type)?.label ?? type
}

/**
 * Obtient la couleur hexadécimale pour un type de capteur
 */
export function getSensorColor(type: string): string {
  const colorMap: Record<string, string> = {
    co2: '#10b981',
    eco2: '#10b981',
    temperature: '#f97316',
    humidity: '#3b82f6',
    pressure: '#06b6d4',
    voc: '#ec4899',
    tvoc: '#db2777',
    co: '#ef4444',
    pm1: '#8b5cf6',
    pm25: '#8b5cf6',
    pm4: '#7c3aed',
    pm10: '#7c3aed',
  }
  return colorMap[type] ?? '#9ca3af'
}

/**
 * Obtient l'unité de mesure pour un type de capteur
 */
export function getSensorUnit(type: string): string {
  return getSensor(type)?.unit ?? ''
}

/**
 * Normalise un type de capteur
 * With canonical keys, this is now a pass-through (identity function)
 */
export function normalizeSensorType(sensorType: string): string {
  return sensorType
}
