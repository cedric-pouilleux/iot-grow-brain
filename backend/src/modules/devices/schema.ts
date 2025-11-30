import { z } from 'zod';

// --- Shared ---
export const ModuleConfigSchema = z.object({
    sensors: z.record(z.string(), z.object({
        interval: z.number().optional(),
        model: z.string().optional(),
    }).catchall(z.any())).optional(),
});

export const ModuleParamsSchema = z.object({
    id: z.string(),
});

// --- Modules ---
export const ModuleListResponseSchema = z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    status: z.any().nullable(),
}));

// --- Dashboard ---
export const DashboardQuerySchema = z.object({
    module: z.string(),
    days: z.string().default('1').transform(Number),
    limit: z.string().default('10000').transform(Number),
});

export const DashboardResponseSchema = z.object({
    status: z.any(),
    sensors: z.object({
        co2: z.array(z.any()),
        temp: z.array(z.any()),
        hum: z.array(z.any()),
    }),
});

export const ConfigUpdateResponseSchema = z.object({
    success: z.boolean(),
    message: z.string()
});
