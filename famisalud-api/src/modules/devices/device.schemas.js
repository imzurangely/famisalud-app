import { z } from 'zod';

const uuidSchema = z.string().uuid();

const osTypeSchema = z.enum(['ANDROID', 'IOS', 'WEB']);

export const deviceParamsSchema = z.object({
  deviceId: uuidSchema
});

export const createSchema = z.object({
  deviceToken: z.string().trim().min(1).max(2000),
  osType: osTypeSchema,
  deviceName: z.string().trim().max(150).nullable().optional()
}).strict();

export const updateSchema = z.object({
  isActive: z.boolean()
}).strict();
