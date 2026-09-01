import { z } from 'zod';

const uuidSchema = z.string().uuid();
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD).');

export const paramsSchema = z.object({ memberId: uuidSchema });
export const resourceParamsSchema = z.object({ memberId: uuidSchema, vaccineId: uuidSchema });

const baseSchema = z.object({
  vaccineName: z.string().trim().min(1).max(150),
  dose: z.string().trim().max(50).optional().nullable(),
  applicationDate: dateSchema.optional().nullable(),
  nextDose: dateSchema.optional().nullable(),
  provider: z.string().trim().max(150).optional().nullable()
}).strict();

export const createSchema = baseSchema.refine(
  (data) => !data.applicationDate || !data.nextDose || data.nextDose >= data.applicationDate,
  { path: ['nextDose'], message: 'La próxima dosis no puede ser anterior a la fecha de aplicación.' }
);

export const updateSchema = baseSchema.partial().refine((data) => Object.keys(data).length > 0, {
  message: 'Debe enviar al menos un campo para actualizar.'
}).refine(
  (data) => !data.applicationDate || !data.nextDose || data.nextDose >= data.applicationDate,
  { path: ['nextDose'], message: 'La próxima dosis no puede ser anterior a la fecha de aplicación.' }
);
