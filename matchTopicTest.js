
// Mock SENSORS
const SENSORS = {
  co2: {},
  voc: {},
  temperature: {},
  humidity: {},
  pm1: {}
}

function matchTopic(topic) {
  const parts = topic.split('/')
  
  // Handle 2-part legacy format: module/sensorType
  if (parts.length === 2) {
    const measurementType = parts[1]
    if (SENSORS[measurementType]) {
      return measurementType
    }
    return undefined
  }

  if (parts.length !== 3) return undefined
  
  const hardwareId = parts[1]
  const measurementType = parts[2]
  
  // Skip system topics
  if (['sensors', 'system', 'hardware'].includes(hardwareId)) {
    return undefined
  }
  
  // All hardware uses canonical keys now - return composite key
  if (SENSORS[measurementType]) {
    return `${hardwareId}:${measurementType}`
  }
  
  return undefined
}

// TEST CASES
console.log('Testing matchTopic...')
console.log('croissance/co2 ->', matchTopic('croissance/co2'))
console.log('croissance/voc ->', matchTopic('croissance/voc'))
console.log('croissance/dht22/temperature ->', matchTopic('croissance/dht22/temperature'))
console.log('croissance/dht22/humidity ->', matchTopic('croissance/dht22/humidity'))
console.log('croissance/sps30/pm1 ->', matchTopic('croissance/sps30/pm1'))
console.log('croissance/sensors/status ->', matchTopic('croissance/sensors/status'))
