import { z } from 'zod';

const uuidSchema = z.string().uuid();
const dateTimeSchema = z.string().datetime({ offset: true });

export const memberIdParamsSchema = z.object({
  memberId: uuidSchema
});

export const resourceParamsSchema = z.object({
  memberId: uuidSchema,
  appointmentId: uuidSchema
});

const appointmentTypeSchema = z.enum([
  'CONSULTA_MEDICA',
  'EXAMEN',
  'PROCEDIMIENTO',
  'CIRUGIA',
  'OTRO'
]);

const statusSchema = z.enum([
  'PROGRAMADA',
  'COMPLETADA',
  'NO_ASISTIO',
  'CANCELADA',
  'REPROGRAMADA'
]);

const baseSchema = z.object({
  title: z.string().trim().min(1).max(150),
  appointmentType: appointmentTypeSchema.optional(),
  customType: z.string().trim().min(1).max(100).nullable().optional(),
  doctorName: z.string().trim().max(150).nullable().optional(),
  location: z.string().trim().max(1000).nullable().optional(),
  startsAt: dateTimeSchema,
  endsAt: dateTimeSchema.nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  status: statusSchema.optional()
});

const validateCustomType = (data, ctx) => {
  const type = data.appointmentType ?? 'CONSULTA_MEDICA';

  if (type === 'OTRO') {
    if (!data.customType?.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['customType'],
        message: 'customType es obligatorio cuando appointmentType es OTRO.'
      });
    }
  } else if (data.customType != null) {
    ctx.addIssue({
      code: 'custom',
      path: ['customType'],
      message: 'customType solo puede enviarse cuando appointmentType es OTRO.'
    });
  }

  if (data.endsAt && new Date(data.endsAt) <= new Date(data.startsAt)) {
    ctx.addIssue({
      code: 'custom',
      path: ['endsAt'],
      message: 'endsAt debe ser posterior a startsAt.'
    });
  }
};

export const createAppointmentSchema = baseSchema.superRefine(validateCustomType).strict();

export const updateAppointmentSchema = baseSchema
  .partial()
  .superRefine((data, ctx) => {
    if (data.appointmentType === 'OTRO' && !data.customType?.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['customType'],
        message: 'customType es obligatorio cuando appointmentType es OTRO.'
      });
    }

    if (data.appointmentType && data.appointmentType !== 'OTRO' && data.customType != null) {
      ctx.addIssue({
        code: 'custom',
        path: ['customType'],
        message: 'customType solo puede enviarse cuando appointmentType es OTRO.'
      });
    }

    if (data.endsAt && data.startsAt && new Date(data.endsAt) <= new Date(data.startsAt)) {
      ctx.addIssue({
        code: 'custom',
        path: ['endsAt'],
        message: 'endsAt debe ser posterior a startsAt.'
      });
    }

    if (!Object.keys(data).length) {
      ctx.addIssue({
        code: 'custom',
        path: [],
        message: 'Debe enviar al menos un campo para actualizar.'
      });
    }
  })
  .strict();
