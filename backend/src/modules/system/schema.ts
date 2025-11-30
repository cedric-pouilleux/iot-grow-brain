import { z } from 'zod';

export const MetricsHistoryQuerySchema = z.object({
    days: z.string().default('30').transform(Number),
});

export const DbSizeResponseSchema = z.object({
    total_size: z.string(),
    total_size_bytes: z.number(),
});

export const MetricsHistoryResponseSchema = z.object({
    history: z.array(z.object({
        time: z.string().or(z.date()),
        code_size_kb: z.number().nullable(),
        db_size_bytes: z.string().or(z.number()),
    })),
    count: z.number(),
    period_days: z.number(),
});

export const StorageResponseSchema = z.object({
    database: z.object({
        total_size: z.string(),
        total_size_bytes: z.number(),
    }),
    tables: z.array(z.object({
        name: z.string(),
        total_size: z.string(),
        total_size_bytes: z.number(),
        table_size: z.string(),
        indexes_size: z.string(),
    })),
    measurements: z.object({
        total_rows: z.number(),
        unique_topics: z.number(),
        oldest_record: z.string().or(z.date()).nullable(),
        newest_record: z.string().or(z.date()).nullable(),
    }),
    timescaledb: z.object({
        total_chunks: z.number(),
        chunks_total_size: z.string(),
        chunks_total_size_bytes: z.number(),
    }).nullable(),
});
