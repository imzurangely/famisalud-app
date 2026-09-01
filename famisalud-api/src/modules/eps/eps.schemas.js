import { z } from 'zod';

const uuidSchema = z.string().uuid();

export const epsParamsSchema = z.object({ epsId: uuidSchema });
export const memberParamsSchema = z.object({ memberId: uuidSchema });
export const insuranceParamsSchema = z.object({ memberId: uuidSchema, insurancePlanId: uuidSchema });

const insuranceBaseSchema = z.object({
  epsId: uuidSchema,
  planNumber: z.string().trim().max(100).optional().nullable(),
  contributorType: z.string().trim().max(50).optional().nullable(),
  contactPhone: z.string().trim().max(30).optional().nullable(),
  website: z.string().url().optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable()
}).strict();

export const createInsuranceSchema = insuranceBaseSchema;
export const updateInsuranceSchema = insuranceBaseSchema.partial().refine((data) => Object.keys(data).length > 0, {
  message: 'Debe enviar al menos un campo para actualizar.'
});
