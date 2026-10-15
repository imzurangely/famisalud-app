import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  API_PREFIX: z.string().default('/api'),
  DATABASE_URL: z.string().min(1),
  DATABASE_SSL: z
    .string()
    .default('false')
    .transform((value) => value.toLowerCase() === 'true'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  ENABLE_DEV_AUTH: z
    .string()
    .default('false')
    .transform((value) => value.toLowerCase() === 'true'),
  DEV_USER_ID: z.string().uuid().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().default(''),
  CLOUDINARY_API_KEY: z.string().default(''),
  CLOUDINARY_API_SECRET: z.string().default(''),
  SMTP_HOST: z.string().default(''),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().default(''),
  SMTP_PASSWORD: z.string().default(''),
  SMTP_FROM: z.string().default(''),
  JWT_SECRET: z.string().min(32).default('dev-only-change-me-famisalud-2026-secret'),
  ACCESS_TOKEN_MINUTES: z.coerce.number().int().positive().default(15),
  REFRESH_TOKEN_DAYS: z.coerce.number().int().positive().default(30),
  REFRESH_COOKIE_NAME: z.string().min(1).default('refresh_token')
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error('Configuración de entorno inválida:', result.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = result.data;

if (env.NODE_ENV === 'production' && env.JWT_SECRET === 'dev-only-change-me-famisalud-2026-secret') {
  console.error('Configuración de entorno inválida: define un JWT_SECRET propio de al menos 32 caracteres.');
  process.exit(1);
}
