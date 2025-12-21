/**
 * HardwareRegistry
 * 
 * Registry for physical hardware sensors (DHT22, BMP280, SPS30, etc.)
 * Links hardware to the measurements they produce.
 */

export interface HardwareDefinition {
  /** Unique identifier (e.g., 'dht22', 'bmp280') */
  id: string
  /** Display name (e.g., 'DHT22', 'BMP280') */
  name: string
  /** Measurement capabilities - keys used in MQTT topics */
  capabilities: string[]
}

class HardwareRegistry {
  private hardware = new Map<string, HardwareDefinition>()

  /**
   * Register a hardware sensor
   */
  register(definition: HardwareDefinition): void {
    this.hardware.set(definition.id, definition)
  }

  /**
   * Get hardware by ID
   */
  get(id: string): HardwareDefinition | undefined {
    return this.hardware.get(id)
  }

  /**
   * Get all hardware that has a specific capability
   */
  getByCapability(capability: string): HardwareDefinition[] {
    return Array.from(this.hardware.values()).filter(hw =>
      hw.capabilities.includes(capability)
    )
  }

  /**
   * Get all registered hardware
   */
  getAll(): HardwareDefinition[] {
    return Array.from(this.hardware.values())
  }

  /**
   * Check if a capability belongs to a specific hardware
   */
  hasCapability(hardwareId: string, capability: string): boolean {
    const hw = this.hardware.get(hardwareId)
    return hw?.capabilities.includes(capability) ?? false
  }
}

export const hardwareRegistry = new HardwareRegistry()
