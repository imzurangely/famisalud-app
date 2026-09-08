import { z } from 'zod';

const uuidSchema = z.string().uuid();
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD).')
  .refine((value) => {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day;
  }, 'La fecha indicada no existe. Debe ingresar una fecha válida.');

const renewalPeriodicitySchema = z.enum(['MENSUAL', 'BIMENSUAL', 'TRIMESTRAL']);
const deliveryStatusSchema = z.enum([
  'PROGRAMADA',
  'RENOVACION_PENDIENTE',
  'LISTO_PARA_RECOGER',
  'PENDIENTE_FARMACIA',
  'RECOGIDO',
  'PERDIDA'
]);

// Campos compartidos entre crear y actualizar una autorización.
const authorizationFields = {
  previousAuthorizationId: uuidSchema.optional().nullable(),
  epsId: uuidSchema.optional().nullable(),
  authorizationNumber: z.string().trim().max(100).optional().nullable(),
  authorizationDate: dateSchema.optional().nullable(),
  validFrom: dateSchema.optional().nullable(),
  validTo: dateSchema.optional().nullable(),
  totalAuthorizedQuantity: z.number().int().positive().optional().nullable(),
  remainingQuantity: z.number().int().nonnegative().optional().nullable(),
  isHighCost: z.boolean().optional(),
  renewalDaysBefore: z.number().int().nonnegative().optional().nullable(),
  renewalPeriodicity: renewalPeriodicitySchema.optional(),
  renewalPhone: z.string().trim().max(30).optional().nullable(),
  renewalWebsite: z.string().url().optional().nullable(),
  renewalChannel: z.string().trim().max(50).optional().nullable(),
  pharmacyName: z.string().trim().max(150).optional().nullable(),
  pharmacyAddress: z.string().trim().max(1000).optional().nullable(),
  pharmacyPhone: z.string().trim().max(30).optional().nullable(),
  pharmacyWebsite: z.string().url().optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable()
};

function validateAuthorizationDates(data, context) {
  if (data.validFrom && data.validTo && data.validTo < data.validFrom) {
    context.addIssue({ code: 'custom', path: ['validTo'], message: 'validTo no puede ser anterior a validFrom.' });
  }
  if (data.authorizationDate && data.validFrom && data.validFrom < data.authorizationDate) {
    context.addIssue({
      code: 'custom',
      path: ['validFrom'],
      message: 'validFrom no puede ser anterior a authorizationDate.'
    });
  }
  if (
    data.totalAuthorizedQuantity !== undefined &&
    data.remainingQuantity !== undefined &&
    data.totalAuthorizedQuantity !== null &&
    data.remainingQuantity !== null &&
    data.remainingQuantity > data.totalAuthorizedQuantity
  ) {
    context.addIssue({
      code: 'custom',
      path: ['remainingQuantity'],
      message: 'remainingQuantity no puede ser mayor que totalAuthorizedQuantity.'
    });
  }
}

export const medicationParamsSchema = z.object({
  memberId: uuidSchema,
  medicationId: uuidSchema
});

export const authorizationParamsSchema = z.object({
  memberId: uuidSchema,
  medicationId: uuidSchema,
  authorizationId: uuidSchema
});

export const deliveryParamsSchema = z.object({
  memberId: uuidSchema,
  medicationId: uuidSchema,
  deliveryId: uuidSchema
});

export const processHistoryParamsSchema = medicationParamsSchema;

export const processHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

export const authorizationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

export const deliveryQuerySchema = z.object({
  status: deliveryStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

export const requestAuthorizationSchema = z.object({
  notes: z.string().trim().max(2000).optional().nullable()
}).strict();

// validFrom, validTo y totalAuthorizedQuantity son obligatorios al crear:
// el service los necesita para generar la primera entrega automáticamente
// y para validar la cantidad de entregas contra el período autorizado.
export const createAuthorizationSchema = z
  .object({
    ...authorizationFields,
    validFrom: dateSchema,
    validTo: dateSchema,
    totalAuthorizedQuantity: z.number().int().positive()
  })
  .strict()
  .superRefine(validateAuthorizationDates);

export const updateAuthorizationSchema = z
  .object(authorizationFields)
  .strict()
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debe enviar al menos un campo para actualizar.'
  })
  .superRefine(validateAuthorizationDates);

// El período (validFrom/validTo/totalAuthorizedQuantity) siempre es nuevo
// en una renovación; lo demás (EPS, farmacia, teléfono de renovación) se
// hereda de la autorización anterior si no se envía.
export const renewalSchema = z
  .object({
    epsId: uuidSchema.optional().nullable(),
    authorizationNumber: z.string().trim().max(100).optional().nullable(),
    authorizationDate: dateSchema.optional().nullable(),
    validFrom: dateSchema,
    validTo: dateSchema,
    totalAuthorizedQuantity: z.number().int().positive(),
    isHighCost: z.boolean().optional(),
    renewalDaysBefore: z.number().int().nonnegative().optional().nullable(),
    renewalPeriodicity: renewalPeriodicitySchema.optional(),
    renewalPhone: z.string().trim().max(30).optional().nullable(),
    renewalWebsite: z.string().url().optional().nullable(),
    renewalChannel: z.string().trim().max(50).optional().nullable(),
    pharmacyName: z.string().trim().max(150).optional().nullable(),
    pharmacyAddress: z.string().trim().max(1000).optional().nullable(),
    pharmacyPhone: z.string().trim().max(30).optional().nullable(),
    pharmacyWebsite: z.string().url().optional().nullable(),
    notes: z.string().trim().max(2000).optional().nullable()
  })
  .strict()
  .superRefine(validateAuthorizationDates);

// El motivo es opcional (el negocio lo pidió así explícitamente): a veces
// simplemente se registró mal, o el usuario no quiere detallar la razón.
export const cancelAuthorizationSchema = z.object({
  reason: z.string().trim().max(500).optional().nullable()
}).strict();

export const collectDeliverySchema = z.object({
  pickedUpDate: dateSchema,
  notes: z.string().trim().max(2000).optional().nullable()
}).strict();
