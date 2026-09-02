import { z } from 'zod';

const uuidSchema = z.string().uuid();
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD).')
  .refine((value) => {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));

    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() + 1 === month &&
      date.getUTCDate() === day
    );
  }, {
    message: 'La fecha indicada no existe. Debe ingresar una fecha válida.'
  });
const dateTimeSchema = z.string().datetime({ offset: true });
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Formato de hora inválido (HH:mm o HH:mm:ss).');

const doseUnitSchema = z.enum([
  'MG', 'ML', 'G', 'MCG', 'UI', 'TABLETA', 'CAPSULA', 'GOTA', 'INHALACION', 'UNIDAD'
]);

const medicationStatusSchema = z.enum(['ACTIVO', 'PAUSADO', 'FINALIZADO', 'OCASIONAL']);
const managementStatusSchema = z.enum([
  'SIN_TRAMITE',
  'AUTORIZACION_EN_PROCESO',
  'CONFIGURACION_PENDIENTE',
  'REQUIERE_RENOVACION',
  'LISTO_PARA_RECOGER'
]);

const scheduleTypeSchema = z.enum([
  'DIARIO',
  'DIAS_SEMANA',
  'INTERVALO_HORAS',
  'MENSUAL',
  'SI_ES_NECESARIO'
]);

const logStatusSchema = z.enum(['PENDIENTE', 'TOMADO', 'OLVIDADO', 'OMITIDO', 'RETRASADO']);

export const medicationParamsSchema = z.object({ memberId: uuidSchema });
export const medicationResourceParamsSchema = z.object({
  memberId: uuidSchema,
  medicationId: uuidSchema
});

export const scheduleResourceParamsSchema = z.object({
  memberId: uuidSchema,
  medicationId: uuidSchema,
  scheduleId: uuidSchema
});

export const logResourceParamsSchema = z.object({
  memberId: uuidSchema,
  medicationId: uuidSchema,
  logId: uuidSchema
});

const medicationFields = {
  name: z.string().trim().min(1).max(150),
  presentation: z.string().trim().max(80).optional().nullable(),
  doseAmount: z.number().positive().optional().nullable(),
  doseUnit: doseUnitSchema.optional().nullable(),
  instructions: z.string().trim().max(2000).optional().nullable(),
  startDate: dateSchema.optional().nullable(),
  endDate: dateSchema.optional().nullable(),
  clinicalStatus: medicationStatusSchema.optional(),
  managementStatus: managementStatusSchema.optional()
};

function validateMedicationDates(data, context) {
  if (data.startDate && data.endDate && data.endDate < data.startDate) {
    context.addIssue({
      code: 'custom',
      path: ['endDate'],
      message: 'La fecha de finalización no puede ser anterior a la fecha de inicio.'
    });
  }

  if (data.doseAmount !== undefined && data.doseAmount !== null && !data.doseUnit) {
    context.addIssue({
      code: 'custom',
      path: ['doseUnit'],
      message: 'La unidad de dosis es obligatoria cuando se informa doseAmount.'
    });
  }
}

export const createMedicationSchema = z.object(medicationFields).strict().superRefine(validateMedicationDates);

export const updateMedicationSchema = z
  .object(medicationFields)
  .strict()
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debe enviar al menos un campo para actualizar.'
  });

const scheduleFields = {
  scheduleType: scheduleTypeSchema,
  startDate: dateSchema,
  endDate: dateSchema.optional().nullable(),
  hour: timeSchema.optional().nullable(),
  daysOfWeek: z.array(z.number().int().min(1).max(7)).min(1).max(7).optional().nullable(),
  intervalHours: z.number().int().min(1).max(168).optional().nullable(),
  dayOfMonth: z.number().int().min(1).max(31).optional().nullable(),
  isActive: z.boolean().optional()
};

function validateSchedule(data, context) {
  if (data.endDate && data.endDate < data.startDate) {
    context.addIssue({
      code: 'custom',
      path: ['endDate'],
      message: 'La fecha de finalización no puede ser anterior a la fecha de inicio.'
    });
  }

  if (data.scheduleType !== 'SI_ES_NECESARIO' && !data.hour) {
    context.addIssue({
      code: 'custom',
      path: ['hour'],
      message: 'La hora es obligatoria para este tipo de horario.'
    });
  }

  if (data.scheduleType === 'DIAS_SEMANA' && (!data.daysOfWeek || data.daysOfWeek.length === 0)) {
    context.addIssue({
      code: 'custom',
      path: ['daysOfWeek'],
      message: 'Debe indicar al menos un día de la semana.'
    });
  }

  if (data.scheduleType === 'INTERVALO_HORAS' && data.intervalHours === undefined) {
    context.addIssue({
      code: 'custom',
      path: ['intervalHours'],
      message: 'Debe indicar el intervalo en horas.'
    });
  }

  if (data.scheduleType === 'MENSUAL' && data.dayOfMonth === undefined) {
    context.addIssue({
      code: 'custom',
      path: ['dayOfMonth'],
      message: 'Debe indicar el día del mes.'
    });
  }

  const applicableFields = new Set(['scheduleType', 'startDate', 'endDate', 'hour', 'isActive']);
  if (data.scheduleType === 'DIAS_SEMANA') applicableFields.add('daysOfWeek');
  if (data.scheduleType === 'INTERVALO_HORAS') applicableFields.add('intervalHours');
  if (data.scheduleType === 'MENSUAL') applicableFields.add('dayOfMonth');

  for (const field of ['daysOfWeek', 'intervalHours', 'dayOfMonth']) {
    if (!applicableFields.has(field) && data[field] !== undefined && data[field] !== null) {
      context.addIssue({
        code: 'custom',
        path: [field],
        message: `El campo ${field} no aplica para este tipo de horario.`
      });
    }
  }
}

export const createScheduleSchema = z.object(scheduleFields).strict().superRefine(validateSchedule);

export const updateScheduleSchema = z
  .object(scheduleFields)
  .strict()
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debe enviar al menos un campo para actualizar.'
  });

const medicationLogFields = {
  scheduledAt: dateTimeSchema,
  takenAt: dateTimeSchema.optional().nullable(),
  status: logStatusSchema,
  notes: z.string().trim().max(2000).optional().nullable(),
  scheduleId: uuidSchema.optional().nullable()
};

function validateLog(data, context) {
  if ((data.status === 'TOMADO' || data.status === 'RETRASADO') && !data.takenAt) {
    context.addIssue({
      code: 'custom',
      path: ['takenAt'],
      message: 'takenAt es obligatorio cuando la toma fue realizada.'
    });
  }

  if ((data.status === 'PENDIENTE' || data.status === 'OLVIDADO' || data.status === 'OMITIDO') && data.takenAt) {
    context.addIssue({
      code: 'custom',
      path: ['takenAt'],
      message: 'takenAt debe ser null para este estado.'
    });
  }
}

export const createMedicationLogSchema = z.object(medicationLogFields).strict().superRefine(validateLog);

export const updateMedicationLogSchema = z
  .object(medicationLogFields)
  .strict()
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debe enviar al menos un campo para actualizar.'
  });

export const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

export const logQuerySchema = historyQuerySchema.extend({
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  status: logStatusSchema.optional()
});
