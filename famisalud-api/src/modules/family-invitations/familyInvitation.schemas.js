import { z } from 'zod';

const uuidSchema = z.string().uuid();
const relationshipSchema = z.enum([
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

export const familyInvitationParamsSchema = z.object({ familyId: uuidSchema });
export const invitationParamsSchema = z.object({ invitationId: uuidSchema });

export const createFamilyInvitationSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  relationship: relationshipSchema,
  customRelationship: z.string().trim().min(1).max(100).optional().nullable(),
  memberId: uuidSchema.optional().nullable()
}).strict().superRefine((data, context) => {
  if (data.relationship === 'OTRO' && !data.customRelationship) {
    context.addIssue({
      code: 'custom',
      path: ['customRelationship'],
      message: 'Debes indicar la relación personalizada cuando relationship es OTRO.'
    });
  }
  if (data.relationship !== 'OTRO' && data.customRelationship) {
    context.addIssue({
      code: 'custom',
      path: ['customRelationship'],
      message: 'customRelationship solo puede enviarse cuando relationship es OTRO.'
    });
  }
});

export const invitationTokenSchema = z.object({
  token: z.string().min(32).max(200)
}).strict();

export const familyInvitationListQuerySchema = z.object({
  status: z.enum(['PENDIENTE', 'ACEPTADA', 'RECHAZADA', 'EXPIRADA']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50)
}).strict();

export const invitationMineQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50)
}).strict();

export const invitationPreviewQuerySchema = z.object({
  token: z.string().min(32).max(200)
}).strict();
