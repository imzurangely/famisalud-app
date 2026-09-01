import { z } from 'zod';

const uuidSchema = z.string().uuid();
const dateTimeSchema = z.string().datetime({ offset: true });

export const memberIdParamsSchema = z.object({ memberId: uuidSchema });

export const resourceParamsSchema = z.object({
  memberId: uuidSchema,
  vitalSignId: uuidSchema
});

const vitalSignFields = {
  systolicPressure: z.number().int().positive().optional().nullable(),
  diastolicPressure: z.number().int().positive().optional().nullable(),
  heartRate: z.number().int().positive().optional().nullable(),
  respiratoryRate: z.number().int().positive().optional().nullable(),
  oxygenSaturation: z.number().min(0).max(100).optional().nullable(),
  bloodGlucose: z.number().nonnegative().optional().nullable(),
  temperature: z.number().positive().optional().nullable(),
  weightKg: z.number().positive().optional().nullable(),
  recordedAt: dateTimeSchema.optional(),
  notes: z.string().trim().max(1000).optional().nullable()
};

export const createVitalSignSchema = z.object(vitalSignFields).strict();

export const updateVitalSignSchema = z
  .object(vitalSignFields)
  .strict()
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debe enviar al menos un campo para actualizar.'
  });
