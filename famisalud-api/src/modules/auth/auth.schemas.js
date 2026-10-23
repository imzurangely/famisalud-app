import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres.')
  .max(128, 'La contraseña no puede superar 128 caracteres.')
  .regex(/[a-z]/, 'La contraseña debe incluir una letra minúscula.')
  .regex(/[A-Z]/, 'La contraseña debe incluir una letra mayúscula.')
  .regex(/[0-9]/, 'La contraseña debe incluir un número.');

export const registerSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    email: z.string().trim().toLowerCase().email().max(254),
    phone: z.string().trim().max(30).optional(),
    password: passwordSchema,
    confirmPassword: z.string().min(1)
  })
  .strict()
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmPassword']
  });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(128)
}).strict();

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254)
}).strict();

export const verifyResetCodeSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  code: z.string().trim().regex(/^\d{6}$/, 'El código debe tener 6 dígitos.')
}).strict();

export const resetPasswordSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    code: z.string().trim().regex(/^\d{6}$/, 'El código debe tener 6 dígitos.'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1)
  })
  .strict()
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmPassword']
  });

export const sessionParamsSchema = z.object({
  sessionId: z.string().uuid()
}).strict();


const genderSchema = z.enum(['MASCULINO', 'FEMENINO', 'NO_BINARIO', 'OTRO', 'PREFIERO_NO_DECIR']);
const bloodTypeSchema = z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']);
const profileDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato YYYY-MM-DD.')
  .refine((value) => {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day;
  }, 'La fecha indicada no existe.');

export const updateOwnProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().min(1).max(100).optional(),
  birthDate: profileDateSchema.nullable().optional(),
  gender: genderSchema.nullable().optional(),
  customGender: z.string().trim().max(100).nullable().optional(),
  bloodType: bloodTypeSchema.nullable().optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  sisben: z.string().trim().max(20).nullable().optional(),
  stratum: z.number().int().min(1).max(6).nullable().optional(),
  avatarUrl: z.string().url().nullable().optional()
}).strict().refine((data) => Object.keys(data).length > 0, {
  message: 'Debes enviar al menos un dato para actualizar.'
});

export const updatePreferencesSchema = z.object({
  timezone: z.string().trim().min(1).max(50).optional(),
  locale: z.enum(['es-CO', 'es', 'en-US', 'en']).optional()
}).strict().refine((data) => Object.keys(data).length > 0, {
  message: 'Debes enviar al menos una preferencia para actualizar.'
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordSchema,
  confirmPassword: z.string().min(1)
}).strict().refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Las contraseñas nuevas no coinciden.',
  path: ['confirmPassword']
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: 'La contraseña nueva debe ser diferente a la actual.',
  path: ['newPassword']
});
