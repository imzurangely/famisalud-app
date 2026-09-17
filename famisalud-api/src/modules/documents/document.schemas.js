import { z } from 'zod';

const uuidSchema = z.string().uuid();

const categorySchema = z.enum([
  'RESULTADO_EXAMENES',
  'HISTORIA_CLINICA',
  'ORDEN_MEDICA',
  'PRESCRIPCION',
  'RECOMENDACION',
  'OTRO'
]);

const emptyToUndefined = (schema) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema);

const optionalDateSchema = emptyToUndefined(
  z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato YYYY-MM-DD.')
    .optional()
    .nullable()
);

const optionalUuidSchema = emptyToUndefined(uuidSchema.optional().nullable());

const baseMetadataSchema = z
  .object({
    title: z.string().trim().min(1).max(150),
    category: categorySchema.default('OTRO'),
    customCategory: z.string().trim().max(100).optional().nullable(),
    documentDate: optionalDateSchema,
    appointmentId: optionalUuidSchema
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.category === 'OTRO') {
      if (!data.customCategory?.trim()) {
        ctx.addIssue({
          code: 'custom',
          path: ['customCategory'],
          message: 'La categoría personalizada es obligatoria cuando category es OTRO.'
        });
      }
      return;
    }

    if (data.customCategory?.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['customCategory'],
        message: 'customCategory solo debe enviarse cuando category es OTRO.'
      });
    }
  });

export const paramsSchema = z.object({
  memberId: uuidSchema
});

export const resourceParamsSchema = z.object({
  memberId: uuidSchema,
  documentId: uuidSchema
});

export const appointmentDocumentsParamsSchema = z.object({
  memberId: uuidSchema,
  appointmentId: uuidSchema
});

export const listQuerySchema = z
  .object({
    category: categorySchema.optional(),
    appointmentId: uuidSchema.optional(),
    search: z.string().trim().max(100).optional()
  })
  .strict();

export const createSchema = baseMetadataSchema;

export const updateSchema = z
  .object({
    title: z.string().trim().min(1).max(150).optional(),
    category: categorySchema.optional(),
    customCategory: z.string().trim().max(100).optional().nullable(),
    documentDate: optionalDateSchema,
    appointmentId: optionalUuidSchema
  })
  .strict();
