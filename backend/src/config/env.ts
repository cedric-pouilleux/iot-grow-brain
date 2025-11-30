import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  MQTT_BROKER: z.string().default('mqtt://localhost'),
  POSTGRES_USER: z.string().default('postgres'),
  DB_HOST: z.string().default('localhost'),
  POSTGRES_PASSWORD: z.string().default('password'),
  DB_PORT: z.string().default('5432').transform(Number),
  POSTGRES_DB: z.string().default('iot_data'),
  API_PORT: z.string().default('3001').transform(Number),
})

const env = envSchema.parse(process.env)

export const config = {
  mqtt: {
    broker: env.MQTT_BROKER,
  },
  db: {
    user: env.POSTGRES_USER,
    host: env.DB_HOST,
    password: env.POSTGRES_PASSWORD,
    port: env.DB_PORT,
    database: env.POSTGRES_DB,
    ssl: false,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    allowExitOnIdle: false,
  },
  api: {
    port: env.API_PORT,
  },
}
