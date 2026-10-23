import { ZodError } from 'zod';

function publicErrorMessage(value, statusCode) {
  const message = String(value ?? '').trim();
  // Los errores del servidor nunca deben mostrarse como si el usuario hubiera
  // introducido mal los datos ni revelar nombres de servicios o infraestructura.
  if (statusCode >= 500) return statusCode === 503
    ? 'Esta función no está disponible temporalmente. Inténtalo más tarde.'
    : 'Ocurrió un problema al completar la solicitud. Inténtalo de nuevo.';
  if (/integridad de la base de datos|reglas de integridad|constraint|foreign key|sqlstate|postgres(?:ql)?|duplicate key value|violates .* constraint|syntax error at or near/i.test(message)) {
    return statusCode === 409
      ? 'No se pudo completar la acción porque hay información relacionada. Revisa los datos e inténtalo de nuevo.'
      : 'No se pudo completar la acción con esos datos. Revisa la información e inténtalo de nuevo.';
  }
  if (/takenAt es obligatorio cuando la toma fue realizada/i.test(message)) return 'Indica la fecha y hora en que tomaste el medicamento.';
  if (/takenAt debe ser null para este estado/i.test(message)) return 'Para este estado no necesitas indicar una fecha de toma.';
  if (/endsAt debe ser posterior a startsAt/i.test(message)) return 'La hora de finalización debe ser posterior a la hora de inicio.';
  if (/customType es obligatorio cuando appointmentType es OTRO/i.test(message)) return 'Describe el tipo de cita cuando seleccionas “Otro”.';
  if (/customCategory solo puede modificarse cuando la categoría es OTRO/i.test(message)) return 'Solo puedes editar la categoría personalizada cuando seleccionas “Otro”.';
  if (/periodicidad de renovación no reconocida/i.test(message)) return 'La frecuencia de renovación seleccionada no es válida. Elige una opción de la lista.';
  if (/solo una entrega (?:en )?LISTO_PARA_RECOGER(?: o PENDIENTE_FARMACIA)? puede marcarse como recogida/i.test(message)) return 'Esta entrega todavía no está lista para confirmar la recogida. Revisa su estado y la fecha programada.';
  if (/solo una entrega en LISTO_PARA_RECOGER puede pasar a PENDIENTE_FARMACIA/i.test(message)) return 'Solo puedes marcar como “Sin existencias” una entrega que ya esté lista para recoger.';
  if (/solo una entrega en RENOVACION_PENDIENTE puede confirmarse como gestionada/i.test(message)) return 'Primero debe quedar pendiente la renovación para poder confirmar que ya la gestionaste.';
  if (/recurso no permitido para autorización/i.test(message)) return 'No tienes permiso para realizar esta acción.';
  return message || 'No pudimos completar la acción. Inténtalo de nuevo.';
}

export function errorHandler(error, req, res, next) {
  console.error(error);

  if (error instanceof ZodError) {
    return res.status(422).json({
      success: false,
      message: 'Revisa la información ingresada e inténtalo de nuevo.',
      errors: error.issues
    });
  }

  if (error.code === '23505') {
    return res.status(409).json({
      success: false,
      message: 'Ya hay un registro con esa información. Revisa los datos e inténtalo de nuevo.'
    });
  }

  if (error.code === '23503') {
    return res.status(409).json({
      success: false,
      message: 'No puedes eliminar este elemento porque está relacionado con otra información. Revisa lo que depende de él e inténtalo de nuevo.'
    });
  }

  if (error.code === '23514') {
    return res.status(422).json({
      success: false,
      message: 'No se pudo completar la acción con esos datos. Revisa las fechas y la información ingresada e inténtalo de nuevo.'
    });
  }

  if (error.statusCode) {
    const statusCode = Number(error.statusCode);
    return res.status(statusCode).json({
      success: false,
      message: publicErrorMessage(error.message, statusCode),
      ...(statusCode < 500 && error.details ? { errors: error.details } : {})
    });
  }

  return res.status(500).json({
    success: false,
    message: 'Ocurrió un problema al completar la solicitud. Inténtalo de nuevo.'
  });
}
