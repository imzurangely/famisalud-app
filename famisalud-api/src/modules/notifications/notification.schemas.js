import { z } from 'zod';

const uuidSchema = z.string().uuid();
const notificationTypes = z.enum([
  'INVITACION_FAMILIA',
  'RECORDATORIO_MEDICAMENTO',
  'RECORDATORIO_CITA',
  'ESTADO_CITA',
  'RENOVACION_MEDICAMENTO',
  'ENTREGA_MEDICAMENTO',
  'SISTEMA'
]);

const booleanFromQuery = z.preprocess((value) => {
  if (value === undefined) return false;
  if (value === true || value === false) return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}, z.boolean());

export const listQuerySchema = z.object({
  unreadOnly: booleanFromQuery,
  notificationType: notificationTypes.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50)
}).strict();

export const resourceParamsSchema = z.object({
  notificationId: uuidSchema
});
