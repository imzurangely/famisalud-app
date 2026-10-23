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
