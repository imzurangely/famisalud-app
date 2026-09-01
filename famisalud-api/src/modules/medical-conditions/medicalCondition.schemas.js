import { z } from 'zod';

const uuidSchema = z.string().uuid();
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD).');

export const paramsSchema = z.object({ memberId: uuidSchema });
export const resourceParamsSchema = z.object({ memberId: uuidSchema, conditionId: uuidSchema });

const baseSchema = z.object({
  name: z.string().trim().min(1).max(150),
  diagnosisDate: dateSchema.optional().nullable(),
  status: z.enum(['ACTIVA', 'EN_TRATAMIENTO', 'RESUELTA']).optional(),
  notes: z.string().trim().max(2000).optional().nullable()
}).strict();

export const createSchema = baseSchema;
export const updateSchema = baseSchema.partial().refine((data) => Object.keys(data).length > 0, {
  message: 'Debe enviar al menos un campo para actualizar.'
});
