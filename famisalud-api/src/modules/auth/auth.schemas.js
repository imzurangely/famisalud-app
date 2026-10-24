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
const nullableText = (max) => z.string().trim().max(max).nullable().optional();
const nullableDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional();

export const ownProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  birthDate: nullableDate,
  gender: genderSchema.nullable().optional(),
  customGender: nullableText(100),
  bloodType: bloodTypeSchema.nullable().optional(),
  phone: nullableText(30),
  sisben: nullableText(20),
  stratum: z.number().int().min(1).max(6).nullable().optional()
}).strict().superRefine((data, ctx) => {
  if (data.gender === 'OTRO' && !data.customGender?.trim()) {
    ctx.addIssue({ code: 'custom', path: ['customGender'], message: 'Especifica tu género.' });
  }
  if (data.gender !== 'OTRO' && data.customGender) {
    ctx.addIssue({ code: 'custom', path: ['customGender'], message: 'Solo indica un género personalizado si seleccionas Otro.' });
  }
});

export const preferencesSchema = z.object({
  timezone: z.string().trim().min(1).max(50),
  locale: z.string().trim().min(2).max(10)
}).strict();
