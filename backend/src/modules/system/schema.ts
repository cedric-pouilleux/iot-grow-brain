import { z } from 'zod';

export const MetricsHistoryQuerySchema = z.object({
    days: z.coerce.number().default(30),
});
