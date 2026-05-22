import { z } from 'zod';

export const bucketMetaSchema = z.object({
  bucket: z.number().int().min(1).max(10),
  meta: z.number().min(0),
});

export const commissionRateSchema = z.object({
  bucket: z.number().int().min(1).max(10),
  level: z.number().int().min(1).max(10),
  amount: z.number().min(0),
});

export const clientStateSchema = z.object({
  name: z.string().min(1).max(50),
  is_active: z.boolean().default(true),
});
