import fp from 'fastify-plugin'
import mqtt from 'mqtt'
import { config } from '../config/env'
import { FastifyInstance } from 'fastify'
import { MqttRepository } from '../modules/mqtt/mqttRepository'
import { MqttMessageHandler } from '../modules/mqtt/mqttMessageHandler'
import type {
  MqttMeasurement,
  DeviceStatusUpdate,
  ModuleConfig,
  SystemData,
  SystemConfigData,
  SensorsStatusData,
  SensorsConfigData,
  HardwareData,
} from '../types/mqtt'

declare module 'fastify' {
  interface FastifyInstance {
    mqtt: mqtt.MqttClient
    publishConfig: (moduleId: string, config: ModuleConfig) => boolean
  }
}

export default fp(async (fastify: FastifyInstance) => {
  const client = mqtt.connect(config.mqtt.broker)
  const mqttRepo = new MqttRepository(fastify.db)

  // --- BUFFERING SYSTEM ---
  const measurementBuffer: MqttMeasurement[] = []
  const statusUpdateBuffer: DeviceStatusUpdate[] = []
  const FLUSH_INTERVAL = 5000

  async function flushMeasurements() {
    if (measurementBuffer.length === 0) {
      fastify.log.debug(`⏭️  Flush skipped: buffer is empty`)
      return
    }

    const batch = [...measurementBuffer]
    const bufferSize = measurementBuffer.length
    measurementBuffer.length = 0

    fastify.log.info(`🔄 Flushing ${batch.length} measurements from buffer...`)

    try {
      await mqttRepo.insertMeasurementsBatch(batch)
      fastify.log.info(`✅ Successfully inserted ${batch.length} measurements into database`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      fastify.log.error(`❌ Batch Insert Error: ${errorMessage}`)
      fastify.log.error(`❌ Failed batch details: ${JSON.stringify(batch.slice(0, 3))}`)
      // Remettre les mesures dans le buffer en cas d'erreur (pour réessayer plus tard)
      measurementBuffer.unshift(...batch)
      fastify.log.warn(`⚠️  ${bufferSize} measurements put back in buffer for retry`)
    }
  }

  async function flushStatusUpdates() {
    if (statusUpdateBuffer.length === 0) return

    const batch = [...statusUpdateBuffer]
    statusUpdateBuffer.length = 0

    for (const update of batch) {
      try {
        await handleDeviceStatusUpdate(mqttRepo, update)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        fastify.log.error(`❌ Status Update Error: ${errorMessage}`)
      }
    }
  }

  // Flush périodique toutes les 5 secondes
  setInterval(() => {
    void flushMeasurements()
  }, FLUSH_INTERVAL)

  // Flush des status updates toutes les 2.5 secondes
  setInterval(() => {
    void flushStatusUpdates()
  }, FLUSH_INTERVAL / 2)

  // Log périodique de l'état du buffer (toutes les 30 secondes)
  setInterval(() => {
    if (measurementBuffer.length > 0) {
      fastify.log.info(
        `📊 Buffer status: ${measurementBuffer.length} measurements waiting to be flushed`
      )
    }
  }, 30000)

  client.on('connect', () => {
    fastify.log.info('✅ Connected to MQTT broker')
    client.subscribe('#', err => {
      if (!err) fastify.log.info('✅ Subscribed to all topics (#)')
    })
    republishAllConfigs(fastify, mqttRepo)
  })

  client.on('error', err => {
    fastify.log.error(`❌ MQTT connection error: ${err.message}`)
  })

  const messageHandler = new MqttMessageHandler(
    fastify,
    mqttRepo,
    measurementBuffer,
    statusUpdateBuffer,
    async () => {
      await flushStatusUpdates()
    },
    async () => {
      await flushMeasurements()
    }
  )

  client.on('message', async (topic, message) => {
    await messageHandler.handleMessage(topic, message)
  })

  fastify.decorate('mqtt', client)
  fastify.decorate('publishConfig', (moduleId: string, config: ModuleConfig) => {
    if (!client) return false
    const topic = `${moduleId}/sensors/config`
    const payload = JSON.stringify(config)
    client.publish(topic, payload, { retain: true, qos: 1 })
    return true
  })

  fastify.addHook('onClose', (instance, done) => {
    flushMeasurements()
    flushStatusUpdates()
    client.end()
    done()
  })
})

async function handleDeviceStatusUpdate(
  mqttRepo: MqttRepository,
  update: DeviceStatusUpdate
): Promise<void> {
  const { moduleId, type, data } = update

  switch (type) {
    case 'system':
      await mqttRepo.updateSystemStatus(moduleId, data as SystemData)
      break
    case 'system_config':
      await mqttRepo.updateSystemConfig(moduleId, data as SystemConfigData)
      break
    case 'sensors_status':
      await mqttRepo.updateSensorStatus(moduleId, data as SensorsStatusData)
      break
    case 'sensors_config':
      await mqttRepo.updateSensorConfig(moduleId, data as SensorsConfigData)
      break
    case 'hardware':
      await mqttRepo.updateHardware(moduleId, data as HardwareData)
      break
  }
}

async function republishAllConfigs(
  fastify: FastifyInstance,
  mqttRepo: MqttRepository
): Promise<void> {
  try {
    const configsByModule = await mqttRepo.getEnabledSensorConfigs()

    // Publish configs
    for (const [moduleId, config] of Object.entries(configsByModule)) {
      fastify.publishConfig(moduleId, config)
    }

    fastify.log.info(`✅ Republished configs for ${Object.keys(configsByModule).length} modules`)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    fastify.log.error(`❌ Error republishing configs: ${errorMessage}`)
  }
}
