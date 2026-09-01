import { z } from 'zod';

const uuidSchema = z.string().uuid();

const familyRelationshipSchema = z.enum([
  'YO_MISMO',
  'PADRE',
  'MADRE',
  'HIJO',
  'HIJA',
  'HERMANO',
  'HERMANA',
  'ABUELO',
  'ABUELA',
  'ESPOSO',
  'ESPOSA',
  'CUIDADOR',
  'OTRO'
]);

export const paramsSchema = z.object({ memberId: uuidSchema });
export const resourceParamsSchema = z.object({ memberId: uuidSchema, contactId: uuidSchema });

const baseSchema = z.object({
  fullName: z.string().trim().min(1).max(150),
  phone: z.string().trim().min(1).max(30),
  relationship: familyRelationshipSchema.default('OTRO'),
  customRelationship: z.string().trim().max(100).optional().nullable(),
  isPrimary: z.boolean().optional(),
  notes: z.string().trim().max(1000).optional().nullable()
});

export const createSchema = baseSchema.strict().superRefine((data, context) => {
  if (data.relationship === 'OTRO' && !data.customRelationship) {
    context.addIssue({
      code: 'custom',
      path: ['customRelationship'],
      message: 'Es obligatorio indicar la relación personalizada.'
    });
  }

  if (data.relationship !== 'OTRO' && data.customRelationship) {
    context.addIssue({
      code: 'custom',
      path: ['customRelationship'],
      message: 'No debe enviar una relación personalizada.'
    });
  }
});

export const updateSchema = baseSchema
  .omit({ relationship: true, customRelationship: true })
  .extend({
    relationship: familyRelationshipSchema.optional(),
    customRelationship: z.string().trim().max(100).optional().nullable()
  })
  .strict()
  .partial()
  .superRefine((data, context) => {
    if (data.relationship === 'OTRO' && data.customRelationship !== undefined && !data.customRelationship) {
      context.addIssue({
        code: 'custom',
        path: ['customRelationship'],
        message: 'Es obligatorio indicar la relación personalizada.'
      });
    }

    if (data.relationship !== undefined && data.relationship !== 'OTRO' && data.customRelationship) {
      context.addIssue({
        code: 'custom',
        path: ['customRelationship'],
        message: 'No debe enviar una relación personalizada.'
      });
    }
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debe enviar al menos un campo para actualizar.'
  });
