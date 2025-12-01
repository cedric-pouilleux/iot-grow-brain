import { z } from 'zod'

// --- Shared ---
export const ModuleConfigSchema = z.object({
  sensors: z
    .record(
      z.string(),
      z.object({
        interval: z.number().optional(),
        model: z.string().optional(),
      })
    )
    .optional(),
})

export const ModuleParamsSchema = z.object({
  id: z.string(),
})

// --- Modules ---
export const ModuleListResponseSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    status: z.null(),
  })
)

// --- Module Data (status + time series) ---
export const ModuleDataQuerySchema = z.object({
  days: z.string().default('1').transform(Number),
  limit: z.string().default('10000').transform(Number),
})

const SensorDataPointSchema = z.object({
  time: z.date().or(z.string()),
  value: z.number(),
})

const SystemInfoSchema = z.object({
  ip: z.string().nullable(),
  mac: z.string().nullable(),
  uptimeStart: z.number().nullable(),
  rssi: z.number().nullable(),
  flash: z.object({
    usedKb: z.number().nullable(),
    freeKb: z.number().nullable(),
    systemKb: z.number().nullable(),
  }),
  memory: z.object({
    heapTotalKb: z.number().nullable(),
    heapFreeKb: z.number().nullable(),
    heapMinFreeKb: z.number().nullable(),
  }),
})

const HardwareInfoSchema = z.object({
  chip: z.object({
    model: z.string().nullable(),
    rev: z.number().nullable(),
    cpuFreqMhz: z.number().nullable(),
    flashKb: z.number().nullable(),
    cores: z.number().nullable(),
  }),
})

const DeviceStatusSchema = z.object({
  system: SystemInfoSchema.optional(),
  hardware: HardwareInfoSchema.optional(),
  sensors: z
    .record(
      z.string(),
      z.object({
        status: z.string(),
        value: z.number().nullable(),
      })
    )
    .optional(),
  sensorsConfig: z
    .object({
      sensors: z.record(
        z.string(),
        z.object({
          interval: z.number().nullable(),
          model: z.string().nullable(),
        })
      ),
    })
    .optional(),
})

export const ModuleDataResponseSchema = z.object({
  status: DeviceStatusSchema,
  sensors: z.object({
    co2: z.array(SensorDataPointSchema),
    temp: z.array(SensorDataPointSchema),
    hum: z.array(SensorDataPointSchema),
    voc: z.array(SensorDataPointSchema),
  }),
})

export const ConfigUpdateResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
})
