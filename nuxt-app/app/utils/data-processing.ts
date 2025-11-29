/**
 * Traite un tableau de données de capteurs en convertissant les timestamps en Date
 * et en inversant l'ordre
 * @param arr - Tableau de données brutes
 * @returns Tableau traité avec des objets Date
 */
export function processSensorData<T extends { time: string | Date }>(
  arr: T[] | null | undefined
): Array<T & { time: Date }> {
  if (!arr) return []
  return arr.map(m => ({ ...m, time: new Date(m.time) })).reverse() as Array<T & { time: Date }>
}

