import { z } from 'zod';

const uuidSchema = z.string().uuid();

export const paramsSchema = z.object({
  memberId: uuidSchema
});

export const resourceParamsSchema = z.object({
  memberId: uuidSchema,
  allergyId: uuidSchema
});

const allergyBaseSchema = z.object({
  allergen: z.string().trim().min(1).max(150),
  reaction: z.string().trim().max(1000).optional().nullable(),
  severity: z.enum(['LEVE', 'MODERADA', 'GRAVE'])
}).strict();

export const createSchema = allergyBaseSchema;
export const updateSchema = allergyBaseSchema.partial().refine((data) => Object.keys(data).length > 0, {
  message: 'Debe enviar al menos un campo para actualizar.'
});
