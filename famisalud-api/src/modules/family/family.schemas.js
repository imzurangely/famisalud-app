import { z } from 'zod';

const uuidSchema = z.string().uuid();
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD).');

const relationshipSchema = z.enum([
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

const genderSchema = z.enum(['MASCULINO', 'FEMENINO', 'NO_BINARIO', 'OTRO', 'PREFIERO_NO_DECIR']);
const bloodTypeSchema = z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']);

export const familyIdParamsSchema = z.object({ familyId: uuidSchema });
export const memberIdParamsSchema = z.object({ memberId: uuidSchema });

// Base sin default: así .partial() no transforma un PATCH sin relationship en relationship=OTRO.
const memberBaseSchema = z.object({
  relationship: relationshipSchema,
  customRelationship: z.string().trim().max(100).optional().nullable(),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  birthDate: dateSchema.optional().nullable(),
  gender: genderSchema.optional().nullable(),
  customGender: z.string().trim().max(100).optional().nullable(),
  bloodType: bloodTypeSchema.optional().nullable(),
  phone: z.string().trim().max(30).optional().nullable(),
  sisben: z.string().trim().max(20).optional().nullable(),
  stratum: z.number().int().min(1).max(6).optional().nullable(),
  avatarUrl: z.string().url().optional().nullable()
});

export const createMemberSchema = memberBaseSchema
  .extend({ relationship: relationshipSchema.default('OTRO') })
  .strict()
  .superRefine((data, context) => {
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

    if (data.gender === 'OTRO' && !data.customGender) {
      context.addIssue({
        code: 'custom',
        path: ['customGender'],
        message: 'Es obligatorio indicar el género personalizado.'
      });
    }

    if (data.gender !== 'OTRO' && data.customGender) {
      context.addIssue({
        code: 'custom',
        path: ['customGender'],
        message: 'No debe enviar un género personalizado.'
      });
    }
  });

export const updateMemberSchema = memberBaseSchema
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debe enviar al menos un campo para actualizar.'
  })
  .superRefine((data, context) => {
    if (data.relationship === 'OTRO' && data.customRelationship === undefined) {
      return;
    }

    if (data.relationship === 'OTRO' && !data.customRelationship) {
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

    if (data.gender === 'OTRO' && data.customGender === undefined) {
      return;
    }

    if (data.gender === 'OTRO' && !data.customGender) {
      context.addIssue({
        code: 'custom',
        path: ['customGender'],
        message: 'Es obligatorio indicar el género personalizado.'
      });
    }

    if (data.gender !== undefined && data.gender !== 'OTRO' && data.customGender) {
      context.addIssue({
        code: 'custom',
        path: ['customGender'],
        message: 'No debe enviar un género personalizado.'
      });
    }
  });

export const createFamilySchema = z.object({
  name: z.string().trim().min(1).max(100),
  isPersonal: z.boolean().optional().default(false)
}).strict();

export const familyMemberLinkSchema = z.object({
  email: z.string().trim().email().max(254)
}).strict();

export const transferAdministratorSchema = z.object({
  newAdminUserId: uuidSchema
}).strict();

export const auditLogQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50)
}).strict();
