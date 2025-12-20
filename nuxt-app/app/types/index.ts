/**
 * Global types for the IoT Dashboard application
 * Only contains types that are truly global and not feature-specific
 */

// ============================================================================
// Module Types
// ============================================================================

export interface Module {
  id: string
  name: string
}

// ============================================================================
// MQTT Types
// ============================================================================

export interface MqttMessage {
  topic: string
  value: number | null
  time: string
  metadata?: Record<string, unknown>
}

// ============================================================================
// Database Types
// ============================================================================

export interface DbSize {
  size?: number
  unit?: string
}
