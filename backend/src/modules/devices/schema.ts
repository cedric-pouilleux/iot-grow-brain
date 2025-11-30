import { z } from 'zod';

export const ModuleConfigSchema = z.object({
    sensors: z.record(z.string(), z.object({
        interval: z.number().optional(),
        model: z.string().optional(),
        // Allow other properties
    }).catchall(z.any())).optional(),
});

export const ModuleParamsSchema = z.object({
    id: z.string(),
});

export const DashboardQuerySchema = z.object({
    module: z.string(),
    days: z.string().default('1').transform(Number),
    limit: z.string().default('10000').transform(Number),
});
