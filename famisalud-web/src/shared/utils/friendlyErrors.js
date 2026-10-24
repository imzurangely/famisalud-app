const TECHNICAL_PATTERNS = [
  /integridad de la base de datos/i,
  /reglas de integridad/i,
  /constraint|foreign key|sqlstate|postgres(?:ql)?|\b2350[0-9]\b/i,
  /ruta no encontrada:/i,
  /internal server error/i,
  /column .* does not exist/i,
  /relation .* does not exist/i,
  /duplicate key value/i,
  /violates .* constraint/i,
  /syntax error at or near/i,
  /TypeError:|ReferenceError:|Cannot read properties|is not a function|is not defined|Unexpected token|ECONNREFUSED|ETIMEDOUT|fetch failed/i,
];

const EXACT_MESSAGES = new Map([
  [
    "Los datos enviados no cumplen las reglas de integridad de la base de datos.",
    "No se pudo completar la acción con esos datos. Revisa las fechas y vuelve a intentarlo.",
  ],
  [
    "No se pudo completar la acción con esos datos. Revisa las fechas y la información ingresada e inténtalo de nuevo.",
    "No se pudo completar la acción con esos datos. Revisa las fechas y vuelve a intentarlo.",
  ],
  [
    "Ya existe un registro con esos datos.",
    "Ya hay un registro con esa información. Revisa los datos e inténtalo de nuevo.",
  ],
  [
    "No puedes eliminar este elemento porque está relacionado con otra información. Revisa lo que depende de él e inténtalo de nuevo.",
    "No puedes eliminar este elemento porque está relacionado con otra información.",
  ],
  [
    "Los datos enviados no son válidos.",
    "Revisa la información ingresada e inténtalo de nuevo.",
  ],
  [
    "Ocurrió un error interno en el servidor.",
    "Ocurrió un problema al completar la solicitud. Inténtalo de nuevo.",
  ],
]);

function specificMessage(raw) {
  if (/pickedUpDate no puede ser una fecha futura/i.test(raw))
    return "La fecha de recogida no puede ser futura.";
  if (/validTo no puede ser anterior a validFrom/i.test(raw))
    return "La fecha de finalización no puede ser anterior a la fecha de inicio.";
  if (/validFrom no puede ser anterior a authorizationDate/i.test(raw))
    return "La vigencia no puede comenzar antes de la fecha de autorización.";
  if (
    /todavía no puedes marcar esta entrega como recogida\. la fecha programada es (.+)\.?/i.test(
      raw,
    )
  ) {
    const date = raw.match(/la fecha programada es (.+?)\.?$/i)?.[1];
    return date
      ? `Todavía no puedes confirmar la recogida. Está programada para el ${date}.`
      : "Todavía no puedes confirmar la recogida porque aún no ha llegado la fecha programada.";
  }
  if (
    /la fecha de recogida no puede ser anterior a la fecha programada/i.test(
      raw,
    )
  )
    return raw;
  if (
    /solo una entrega (?:en )?LISTO_PARA_RECOGER(?: o PENDIENTE_FARMACIA)? puede marcarse como recogida/i.test(
      raw,
    )
  )
    return "Esta entrega todavía no está lista para confirmar la recogida. Revisa su estado y la fecha programada.";
  if (
    /solo una entrega en LISTO_PARA_RECOGER puede pasar a PENDIENTE_FARMACIA/i.test(
      raw,
    )
  )
    return "Solo puedes marcar como “Sin existencias” una entrega que ya esté lista para recoger.";
  if (
    /solo una entrega en RENOVACION_PENDIENTE puede confirmarse como gestionada/i.test(
      raw,
    )
  )
    return "Primero debe quedar pendiente la renovación para poder confirmar que ya la gestionaste.";
  if (/takenAt es obligatorio cuando la toma fue realizada/i.test(raw))
    return "Indica la fecha y hora en que tomaste el medicamento.";
  if (/takenAt debe ser null para este estado/i.test(raw))
    return "Para este estado no necesitas indicar una fecha de toma.";
  if (/endsAt debe ser posterior a startsAt/i.test(raw))
    return "La hora de finalización debe ser posterior a la hora de inicio.";
  if (/customType es obligatorio cuando appointmentType es OTRO/i.test(raw))
    return "Describe el tipo de cita cuando seleccionas “Otro”.";
  if (
    /customCategory solo puede modificarse cuando la categoría es OTRO/i.test(
      raw,
    )
  )
    return "Solo puedes editar la categoría personalizada cuando seleccionas “Otro”.";
  if (/periodicidad de renovación no reconocida/i.test(raw))
    return "La frecuencia de renovación seleccionada no es válida. Elige una opción de la lista.";
  if (/recurso no permitido para autorización/i.test(raw))
    return "No tienes permiso para realizar esta acción.";
  if (/debe adjuntar un archivo en el campo file/i.test(raw))
    return "Selecciona el archivo que deseas subir.";
  if (/solo se permite un archivo en el campo file/i.test(raw))
    return "Selecciona un único archivo para continuar.";
  if (
    /el horario indicado no existe, no pertenece al medicamento o está inactivo/i.test(
      raw,
    )
  )
    return "Este horario ya no está disponible para el medicamento seleccionado. Actualiza la pantalla e inténtalo de nuevo.";
  if (/no fue posible conectar con famisalud/i.test(raw))
    return "No pudimos conectar con FamiSalud. Comprueba tu conexión e inténtalo de nuevo.";
  return null;
}

export function makeFriendlyMessage(value, { status } = {}) {
  const raw = String(value ?? "").trim();
  if (!raw)
    return status >= 500
      ? "Ocurrió un problema al guardar la información. Inténtalo nuevamente."
      : "No pudimos completar la acción. Inténtalo de nuevo.";
  if (EXACT_MESSAGES.has(raw)) return EXACT_MESSAGES.get(raw);
  const specific = specificMessage(raw);
  if (specific) return specific;
  if (
    /no puedes realizar la operación porque existen relaciones asociadas/i.test(
      raw,
    )
  )
    return "No puedes eliminar este elemento porque está relacionado con otra información.";
  if (/ya existe un registro con esos datos/i.test(raw))
    return "Ya hay un registro con esa información. Revisa los datos e inténtalo de nuevo.";
  if (status >= 500) {
    return status === 503
      ? "Esta función no está disponible temporalmente. Inténtalo más tarde."
      : "Ocurrió un problema al completar la solicitud. Inténtalo de nuevo.";
  }
  if (TECHNICAL_PATTERNS.some((pattern) => pattern.test(raw))) {
    return status === 409
      ? "No se pudo completar la acción porque hay información relacionada. Revisa los datos e inténtalo de nuevo."
      : "No se pudo completar la acción con esos datos. Revisa la información e inténtalo de nuevo.";
  }
  return raw;
}

export function friendlyErrorMessage(
  error,
  fallback = "No pudimos completar la acción. Inténtalo de nuevo.",
) {
  const status = Number(error?.status ?? error?.statusCode ?? 0);
  if (error?.message) return makeFriendlyMessage(error.message, { status });

  // No mostramos textos crudos de validadores ni nombres internos de columnas.
  const issues = error?.data?.errors;
  if (Array.isArray(issues) && issues.length) {
    const visible = issues
      .map((issue) => makeFriendlyMessage(issue?.message, { status }))
      .filter(
        (item) =>
          item &&
          !/invalid input|expected .* received|undefined|constraint|column/i.test(
            item,
          ),
      );
    if (visible.length && visible.length === issues.length)
      return [...new Set(visible)].join(" ");
    return "Revisa la información ingresada e inténtalo de nuevo.";
  }
  return fallback;
}
