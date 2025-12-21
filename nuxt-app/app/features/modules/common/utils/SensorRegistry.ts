export interface SensorDefinition {
  key: string
  label: string
  unit?: string
  color?: string
  range?: [number, number]
  type?: 'pm' | 'gas' | 'weather' | 'other'
}

class SensorRegistry {
  private sensors = new Map<string, SensorDefinition>()

  register(definition: SensorDefinition) {
    this.sensors.set(definition.key, definition)
  }

  get(key: string): SensorDefinition | undefined {
    return this.sensors.get(key)
  }

  getAll(): SensorDefinition[] {
    return Array.from(this.sensors.values())
  }

  /**
   * Check if a topic matches a registered sensor
   * Returns the sensor key if found
   */
  matchesTopic(topic: string): string | undefined {
    // Check for suffix match
    for (const key of this.sensors.keys()) {
      if (topic.endsWith(`/${key}`)) {
        return key
      }
    }
    return undefined
  }
}

export const sensorRegistry = new SensorRegistry()
