// ============================================================================
// Módulo de Trámites de Medicamentos - FamiSalud
//
// Resumen del modelo mental (léelo antes de tocar este archivo):
//
// - El usuario NUNCA crea ni edita entregas manualmente. No existe endpoint
//   para eso. El service las genera solo en dos momentos:
//     a) al crear/renovar una autorización -> genera la entrega #1
//     b) al cerrar un ciclo (recogida o pérdida) -> genera la siguiente,
//        si a la autorización le quedan entregas.
//
// - medications.management_status es SIEMPRE un espejo del status de la
//   entrega abierta actual (ver deriveManagementStatusFromDeliveryStatus).
//   Nunca lo mueve el estado de configuración de la autorización.
//
// - El "estado de configuración" de una autorización (falta teléfono/web de
//   renovación o datos de farmacia) NUNCA se guarda en la base de datos.
//   Se calcula al vuelo en getConfigurationStatus() cada vez que se lee.
//
// - remaining_quantity se descuenta en el mismo momento en que se cierra un
//   ciclo (recogida o pérdida), nunca solo porque llegó la fecha.
//
// - El job diario (medicationProcess.cron.js) es quien dispara las
//   transiciones automáticas por fecha (PROGRAMADA -> RENOVACION_PENDIENTE,
//   vencimiento -> PERDIDA). Ese cron llama a las funciones de este service
//   (closeDeliveryCycleAsLost, promoteScheduledDeliveryToRenewalPending) en
//   vez de duplicar la lógica, para que exista un solo lugar de verdad.
// ============================================================================

import { withTransaction } from '../../config/database.js';
import { AppError } from '../../shared/utils/AppError.js';
import {
  assertCanManageMember,
  assertCanViewMember
} from '../../shared/authorization/familyAccess.js';
import { writeAuditLog } from '../../shared/utils/auditLog.js';
import * as repository from './medicationProcess.repository.js';
import { findActivePlanByMember, createPlan as createInsurancePlan } from '../eps/eps.repository.js';

const AUTH_ENTITY = 'medication_authorizations';
const DELIVERY_ENTITY = 'medication_deliveries';
const MEDICATION_ENTITY = 'medications';

const PERIODICITY_MONTHS = {
  MENSUAL: 1,
  BIMENSUAL: 2,
  TRIMESTRAL: 3
};

// Para agregar una periodicidad nueva en el futuro (ej. SEMESTRAL):
//   1. Agregar el valor al enum renewal_periodicity_enum en la base de datos.
//   2. Agregar su equivalencia en meses aquí, en PERIODICITY_MONTHS.
//   3. Si necesita un margen de pickup_deadline distinto al de "+10 días"
//      (ver calculatePickupDeadline), agregar su caso ahí también.
// No hay que tocar nada más: el resto del cálculo es genérico.

// ----------------------------------------------------------------------------
// Utilidades de fecha
// ----------------------------------------------------------------------------

function getValidDate(value) {
  if (!value) return null;

  const dateString = value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
  const [year, month, day] = dateString.split('-').map(Number);

  if (![year, month, day].every(Number.isInteger)) {
    throw new AppError('La fecha indicada no existe. Debe ingresar una fecha válida.', 422);
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    throw new AppError('La fecha indicada no existe. Debe ingresar una fecha válida.', 422);
  }

  return date;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function todayDateString() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function lastDayOfMonth(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
}

function addMonthsClamped(referenceDate, months) {
  const date = getValidDate(referenceDate);
  const originalDay = date.getUTCDate();
  const targetMonthIndex = date.getUTCMonth() + months;

  date.setUTCDate(1);
  date.setUTCMonth(targetMonthIndex);
  date.setUTCDate(Math.min(originalDay, lastDayOfMonth(date)));

  return formatDate(date);
}

function addDays(referenceDate, days) {
  const date = getValidDate(referenceDate);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDate(date);
}

// Ciclos mensuales completos entre dos fechas, siguiendo el mismo
// desplazamiento de calendario con ajuste al último día del mes que usa la
// programación real de las entregas. La primera entrega se cuenta aparte:
// del 2026-10-23 al 2026-11-23 son dos entregas mensuales (octubre y noviembre).
function monthsBetween(fromStr, toStr) {
  const from = getValidDate(fromStr);
  const to = getValidDate(toStr);
  let months = (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth());
  if (months > 0 && toStr < addMonthsClamped(fromStr, months)) months -= 1;
  return months;
}

// Regla de margen de pickup_deadline (ver punto 1 del diseño):
//   MENSUAL              -> último día del mes calendario de scheduledDate.
//   BIMENSUAL/TRIMESTRAL -> scheduledDate + 10 días.
// Este es el único lugar a tocar si el margen cambia más adelante.
function calculatePickupDeadline(scheduledDateStr, periodicity) {
  if (!scheduledDateStr) return null;

  if (periodicity === 'MENSUAL') {
    const date = getValidDate(scheduledDateStr);
    const lastDay = lastDayOfMonth(date);
    date.setUTCDate(lastDay);
    return formatDate(date);
  }

  return addDays(scheduledDateStr, 10);
}

function calculateNextScheduledDate(baseDateStr, periodicity) {
  const months = PERIODICITY_MONTHS[periodicity] ?? 1;
  return addMonthsClamped(baseDateStr, months);
}

// ----------------------------------------------------------------------------
// Configuración de la autorización (calculada, nunca almacenada)
// ----------------------------------------------------------------------------

function hasRenewalConfiguration(authorization) {
  if (!authorization) return false;
  return Boolean(
    authorization.renewal_phone || authorization.renewal_website || authorization.renewal_channel
  );
}

function hasPharmacyConfiguration(authorization) {
  if (!authorization) return false;
  return Boolean(
    authorization.pharmacy_name ||
      authorization.pharmacy_address ||
      authorization.pharmacy_phone ||
      authorization.pharmacy_website
  );
}

function getConfigurationStatus(authorization) {
  if (!authorization) return 'PENDIENTE';
  return hasRenewalConfiguration(authorization) && hasPharmacyConfiguration(authorization)
    ? 'CONFIGURADA'
    : 'PENDIENTE';
}

function decorateAuthorization(authorization) {
  if (!authorization) return authorization;
  return {
    ...authorization,
    configurationStatus: getConfigurationStatus(authorization)
  };
}

// ----------------------------------------------------------------------------
// management_status del medicamento: siempre espejo del status de la
// entrega abierta actual. Nunca lo toca la configuración de la autorización.
// ----------------------------------------------------------------------------

function deriveManagementStatusFromDeliveryStatus(deliveryStatus) {
  switch (deliveryStatus) {
    case 'LISTO_PARA_RECOGER':
    case 'PENDIENTE_FARMACIA':
      return 'LISTO_PARA_RECOGER';
    case 'PROGRAMADA':
    case 'RENOVACION_PENDIENTE':
      return 'REQUIERE_RENOVACION';
    default:
      return null;
  }
}

// ----------------------------------------------------------------------------
// Validaciones
// ----------------------------------------------------------------------------

function validateAuthorizationAgainstMedication(data, medication) {
  const start = data.validFrom ?? null;
  const end = data.validTo ?? null;

  if (start && medication.start_date && start < formatDate(new Date(medication.start_date))) {
    throw new AppError('La autorización no puede iniciar antes que el medicamento.', 422);
  }
  if (end && medication.end_date && end > formatDate(new Date(medication.end_date))) {
    throw new AppError('La autorización no puede finalizar después que el medicamento.', 422);
  }
}

// La cantidad de entregas autorizadas debe corresponder exactamente al
// período de la autorización según su periodicidad (regla #4 del negocio).
function validateAuthorizationPeriod(data) {
  const { validFrom, validTo, totalAuthorizedQuantity, renewalPeriodicity } = data;

  if (!validFrom || !validTo || totalAuthorizedQuantity === undefined || totalAuthorizedQuantity === null) {
    // Sin estos tres datos no se puede validar ni generar la primera
    // entrega automáticamente, así que se exigen en la creación.
    throw new AppError(
      'validFrom, validTo y totalAuthorizedQuantity son obligatorios para crear una autorización.',
      422
    );
  }

  const periodicity = renewalPeriodicity ?? 'MENSUAL';
  const periodicityMonths = PERIODICITY_MONTHS[periodicity];
  if (!periodicityMonths) {
    throw new AppError(`Periodicidad de renovación no reconocida: ${periodicity}.`, 422);
  }

  const elapsedMonths = monthsBetween(validFrom, validTo);
  const expectedDeliveries = elapsedMonths / periodicityMonths + 1;

  if (!Number.isInteger(expectedDeliveries) || expectedDeliveries !== totalAuthorizedQuantity) {
    throw new AppError(
      `La cantidad de entregas (${totalAuthorizedQuantity}) no corresponde al período autorizado. ` +
        `Con periodicidad ${periodicity} entre ${validFrom} y ${validTo} transcurren ${elapsedMonths} meses completos; contando la primera entrega del inicio, deberían ser ${expectedDeliveries} entregas.`,
      422
    );
  }
}

async function getMedicationOrFail(client, medicationId, memberId) {
  const medication = await repository.findMedication(client, medicationId, memberId);
  if (!medication) throw new AppError('Medicamento no encontrado.', 404);
  return medication;
}

// ----------------------------------------------------------------------------
// Alertas de la autorización (calculadas, no almacenadas)
// ----------------------------------------------------------------------------

function buildAuthorizationAlert(authorization) {
  if (!authorization) {
    return { status: 'NINGUNA', message: null };
  }

  if (authorization.canceled_at) {
    return {
      status: 'ANULADA',
      message: authorization.cancellation_reason
        ? `Esta autorización fue anulada. Motivo: ${authorization.cancellation_reason}`
        : 'Esta autorización fue anulada.'
    };
  }

  const remaining = authorization.remaining_quantity;

  if (remaining === 0) {
    return {
      status: 'AUTORIZACION_AGOTADA',
      message: 'Se agotaron las entregas de esta autorización. Registra una nueva autorización si el tratamiento continúa.'
    };
  }

  if (remaining === 1) {
    return {
      status: 'ULTIMA_ENTREGA',
      message: 'Esta es la última entrega disponible de esta autorización. Si necesitas continuar el tratamiento, gestiona una nueva autorización con tu médico.'
    };
  }

  return { status: 'NINGUNA', message: null };
}

// ----------------------------------------------------------------------------
// Generación automática de entregas (el único lugar donde se insertan filas
// en medication_deliveries)
// ----------------------------------------------------------------------------

async function generateFirstDelivery(client, medicationId, authorization, userId) {
  const scheduledDate = formatDate(new Date(authorization.valid_from));
  const pickupDeadline = calculatePickupDeadline(scheduledDate, authorization.renewal_periodicity);

  const delivery = await repository.insertGeneratedDelivery(client, medicationId, {
    authorizationId: authorization.id,
    deliveryNumber: await repository.getNextDeliveryNumber(client, medicationId),
    scheduledDate,
    pickupDeadline,
    status: 'LISTO_PARA_RECOGER',
    pharmacyName: authorization.pharmacy_name,
    pharmacyAddress: authorization.pharmacy_address,
    pharmacyPhone: authorization.pharmacy_phone,
    pharmacyWebsite: authorization.pharmacy_website
  });

  await repository.updateMedicationManagementStatus(client, medicationId, 'LISTO_PARA_RECOGER');
  await repository.insertProcessHistory(client, {
    medicationId,
    authorizationId: authorization.id,
    deliveryId: delivery.id,
    eventType: 'ENTREGA_GENERADA',
    userId,
    notes: 'Primera entrega generada automáticamente a partir de la fecha de inicio de la autorización.'
  });

  await notifyPickupReady(client, medicationId, delivery.id);

  return delivery;
}

// Cierra el ciclo de una entrega (ya sea porque se recogió o porque se
// perdió) y decide qué sigue: generar la próxima entrega, o dejar la
// autorización agotada. baseDate es la fecha real de recogida si se
// recogió, o el scheduled_date original si se perdió (no hay fecha real).
async function closeDeliveryCycle(client, { medication, delivery, userId, baseDate, lost }) {
  const authorization = await repository.findAuthorizationById(client, delivery.authorization_id, medication.id, true);
  if (!authorization) return;

  const updatedAuthorization = await repository.decrementRemainingQuantity(client, authorization.id, medication.id);

  if (updatedAuthorization.remaining_quantity > 0) {
    const nextScheduledDate = calculateNextScheduledDate(baseDate, authorization.renewal_periodicity);
    const nextPickupDeadline = calculatePickupDeadline(nextScheduledDate, authorization.renewal_periodicity);

    const nextDelivery = await repository.insertGeneratedDelivery(client, medication.id, {
      authorizationId: authorization.id,
      scheduledDate: nextScheduledDate,
      pickupDeadline: nextPickupDeadline,
      status: 'PROGRAMADA',
      pharmacyName: authorization.pharmacy_name,
      pharmacyAddress: authorization.pharmacy_address,
      pharmacyPhone: authorization.pharmacy_phone,
      pharmacyWebsite: authorization.pharmacy_website
    });

    await repository.updateMedicationManagementStatus(client, medication.id, 'REQUIERE_RENOVACION');
    await repository.insertProcessHistory(client, {
      medicationId: medication.id,
      authorizationId: authorization.id,
      deliveryId: nextDelivery.id,
      eventType: 'ENTREGA_GENERADA',
      userId,
      notes: lost
        ? `Siguiente entrega generada tras pérdida de la entrega anterior. Próxima fecha: ${nextScheduledDate}.`
        : `Siguiente entrega generada a partir de la recogida real (${baseDate}). Próxima fecha: ${nextScheduledDate}.`
    });
  } else {
    await repository.updateMedicationManagementStatus(client, medication.id, 'SIN_AUTORIZACION_VIGENTE');
    await repository.insertProcessHistory(client, {
      medicationId: medication.id,
      authorizationId: authorization.id,
      deliveryId: delivery.id,
      eventType: 'RENOVACION_REQUERIDA',
      userId,
      notes: 'Se agotaron las entregas autorizadas. Se requiere una nueva autorización para continuar.'
    });
  }
}

// ----------------------------------------------------------------------------
// Notificaciones (fan-out a los destinatarios configurados del medicamento)
// ----------------------------------------------------------------------------

async function notifyRecipients(client, medicationId, { notificationType, title, body, entityId, dedupe = true }) {
  const [configuredRecipients, medication] = await Promise.all([
    repository.listReminderRecipients(client, medicationId),
    repository.findMedicationById(client, medicationId)
  ]);

  // El usuario vinculado al perfil recibe los avisos de su propio tratamiento
  // por defecto. Los demás destinatarios seleccionados se agregan como copias.
  const recipients = [...new Set([
    ...configuredRecipients,
    ...(medication?.linked_user_id ? [medication.linked_user_id] : [])
  ])];

  const medicationName = medication?.name?.trim() || 'el medicamento';
  const memberName = [medication?.member_first_name, medication?.member_last_name]
    .filter(Boolean)
    .join(' ')
    .trim() || 'el miembro de la familia';

  for (const userId of recipients) {
    const isRecipientTheMedicationOwner = medication?.linked_user_id === userId;
    const notificationContext = { medicationName, memberName, isRecipientTheMedicationOwner };
    const generatedTitle = typeof title === 'function' ? title(notificationContext) : `${title}: ${medicationName}`;
    // El campo title admite 150 caracteres. Si el contexto y el nombre juntos
    // exceden el límite, priorizamos conservar el nombre completo del medicamento.
    const notificationTitle = generatedTitle.length <= 150 ? generatedTitle : medicationName.slice(0, 150);
    const notificationBody = typeof body === 'function' ? body(notificationContext) : `${body} Medicamento: ${medicationName}.`;

    if (dedupe) {
      const alreadySent = await repository.existsNotificationForEntity(client, {
        userId,
        entityId,
        notificationType,
        title: notificationTitle
      });
      if (alreadySent) continue;
    }

    await repository.insertNotification(client, {
      userId,
      notificationType,
      title: notificationTitle,
      body: notificationBody,
      entityType: DELIVERY_ENTITY,
      entityId
    });
  }
}

async function notifyPickupReady(client, medicationId, deliveryId) {
  await notifyRecipients(client, medicationId, {
    notificationType: 'ENTREGA_MEDICAMENTO',
    title: ({ medicationName, memberName, isRecipientTheMedicationOwner }) =>
      isRecipientTheMedicationOwner
        ? `Ya puedes recoger ${medicationName}`
        : `${medicationName} listo para recoger para ${memberName}`,
    body: ({ medicationName, memberName, isRecipientTheMedicationOwner }) =>
      isRecipientTheMedicationOwner
        ? `La entrega de ${medicationName} está lista para recoger. Consulta la fecha límite y la farmacia en Medicamentos y trámites.`
        : `La entrega de ${medicationName} para ${memberName} está lista para recoger. Consulta la fecha límite y la farmacia en Medicamentos y trámites.`,
    entityId: deliveryId
  });
}

// ----------------------------------------------------------------------------
// Autorizaciones
// ----------------------------------------------------------------------------

export async function requestAuthorization(memberId, medicationId, userId, notes = null) {
  return withTransaction(async (client) => {
    const { member } = await assertCanManageMember(client, memberId, userId);
    const medicationBefore = await getMedicationOrFail(client, medicationId, memberId);

    await repository.updateMedicationManagementStatus(client, medicationId, 'AUTORIZACION_EN_PROCESO');
    await repository.insertProcessHistory(client, {
      medicationId,
      eventType: 'AUTORIZACION_SOLICITADA',
      userId,
      notes
    });

    await writeAuditLog(client, {
      userId,
      familyId: member.family_id,
      action: 'UPDATE',
      entity: MEDICATION_ENTITY,
      entityId: medicationId,
      changes: {
        oldManagementStatus: medicationBefore.management_status,
        newManagementStatus: 'AUTORIZACION_EN_PROCESO',
        reason: 'Solicitud de autorización'
      }
    });

    return repository.findMedication(client, medicationId, memberId);
  });
}

export async function listAuthorizations(memberId, medicationId, userId, limit) {
  return withTransaction(async (client) => {
    await assertCanViewMember(client, memberId, userId);
    await getMedicationOrFail(client, medicationId, memberId);
    const authorizations = await repository.listAuthorizations(client, medicationId, limit);
    return authorizations.map(decorateAuthorization);
  });
}

export async function getAuthorization(memberId, medicationId, authorizationId, userId) {
  return withTransaction(async (client) => {
    await assertCanViewMember(client, memberId, userId);
    await getMedicationOrFail(client, medicationId, memberId);
    const authorization = await repository.findAuthorizationById(client, authorizationId, medicationId);
    if (!authorization) throw new AppError('Autorización no encontrada.', 404);
    return {
      ...decorateAuthorization(authorization),
      alert: buildAuthorizationAlert(authorization)
    };
  });
}

// Resuelve la EPS de la autorización a partir de la afiliación (insurance
// plan) activa del miembro. Si el miembro no tiene ninguna, exige que se
// envíe epsId explícitamente y, en ese caso, le crea automáticamente su
// primera afiliación con esa EPS (el resto de los datos del plan —
// plan_number, contributor_type, etc.— los completa el usuario después
// desde su perfil; aquí solo se resuelve el vínculo con la EPS).
async function resolveAuthorizationEps(client, memberId, requestedEpsId) {
  const activePlan = await findActivePlanByMember(client, memberId);
  if (activePlan) {
    return activePlan.eps_id;
  }

  if (!requestedEpsId) {
    throw new AppError(
      'Este miembro todavía no tiene una EPS registrada. Debes indicar epsId para poder continuar; se le asociará automáticamente como su afiliación.',
      422
    );
  }

  const eps = await repository.findActiveEps(client, requestedEpsId);
  if (!eps) throw new AppError('La EPS seleccionada no existe o está inactiva.', 422);

  await createInsurancePlan(client, memberId, { epsId: requestedEpsId });

  return requestedEpsId;
}

// Convierte el nombre del medicamento en el bloque legible del número de
// autorización: sin tildes, en mayúsculas, con guiones entre palabras, y
// pegando un número a la unidad que lo sigue ("50 mg" -> "50MG") para que
// no quede un guion partiendo la dosis en dos.
// Ejemplo: "Losartán 50 mg" -> "LOSARTAN-50MG"
function buildMedicationAuthorizationSlug(medicationName) {
  return medicationName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/(\d+)\s+([A-Z]+)/g, '$1$2')
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Si no se envía authorizationNumber, se genera uno propio y legible por
// medicamento: "AUT-LOSARTAN-50MG-001", "AUT-LOSARTAN-50MG-002"...
// (secuencial para ese medicamento, con relleno de ceros a 3 dígitos).
async function resolveAuthorizationNumber(client, medicationId, medicationName, providedNumber) {
  if (providedNumber) return providedNumber;
  const nextNumber = await repository.getNextAuthorizationNumber(client, medicationId);
  const slug = buildMedicationAuthorizationSlug(medicationName);
  const paddedNumber = String(nextNumber).padStart(3, '0');
  return `AUT-${slug}-${paddedNumber}`;
}

// Si no se envía authorizationDate: si existe una solicitud de autorización
// pendiente (POST .../authorization-request) sin resolver, se usa la fecha
// en que se solicitó; si no, se usa validFrom (se registró directo, sin
// pasar antes por "solicitada").
async function resolveAuthorizationDate(client, medicationId, providedDate, validFrom) {
  if (providedDate) return providedDate;
  const requestedAt = await repository.findLatestUnfulfilledAuthorizationRequest(client, medicationId);
  if (!requestedAt) return validFrom;

  const requestedDate = formatDate(new Date(requestedAt));
  // authorization_date nunca puede quedar después de valid_from (lo exige la
  // base de datos); si la solicitud quedó registrada más tarde que el inicio
  // de vigencia elegido, se usa validFrom en su lugar.
  return requestedDate > validFrom ? validFrom : requestedDate;
}

async function finalizeNewAuthorization(client, { member, medication, medicationId, userId, memberId, prepared }) {
  // Función interna compartida por createAuthorization y renewAuthorization:
  // resuelve EPS/número/fecha, valida, inserta la autorización y genera su
  // primera entrega automáticamente.
  prepared.epsId = await resolveAuthorizationEps(client, memberId, prepared.epsId);

  if (prepared.previousAuthorizationId) {
    const previous = await repository.findAuthorizationById(client, prepared.previousAuthorizationId, medicationId);
    if (!previous) throw new AppError('La autorización anterior no pertenece al medicamento.', 422);
  }

  validateAuthorizationAgainstMedication(prepared, medication);
  validateAuthorizationPeriod(prepared);

  prepared.authorizationNumber = await resolveAuthorizationNumber(
    client,
    medicationId,
    medication.name,
    prepared.authorizationNumber
  );
  prepared.authorizationDate = await resolveAuthorizationDate(
    client,
    medicationId,
    prepared.authorizationDate,
    prepared.validFrom
  );

  if (prepared.remainingQuantity === undefined || prepared.remainingQuantity === null) {
    prepared.remainingQuantity = prepared.totalAuthorizedQuantity;
  }

  const authorization = await repository.createAuthorization(client, medicationId, prepared);
  const delivery = await generateFirstDelivery(client, medicationId, authorization, userId);

  await repository.insertProcessHistory(client, {
    medicationId,
    authorizationId: authorization.id,
    eventType: 'AUTORIZACION_APROBADA',
    userId
  });

  await writeAuditLog(client, {
    userId,
    familyId: member.family_id,
    action: 'CREATE',
    entity: AUTH_ENTITY,
    entityId: authorization.id,
    changes: { new: authorization, medicationId }
  });

  await writeAuditLog(client, {
    userId,
    familyId: member.family_id,
    action: 'CREATE',
    entity: DELIVERY_ENTITY,
    entityId: delivery.id,
    changes: { new: delivery, medicationId, reason: 'Primera entrega generada automáticamente' }
  });

  return decorateAuthorization(authorization);
}

export async function createAuthorization(memberId, medicationId, userId, data = {}) {
  return withTransaction(async (client) => {
    const { member } = await assertCanManageMember(client, memberId, userId);
    const medication = await getMedicationOrFail(client, medicationId, memberId);
    const previousAuthorization = await repository.findPreviousAuthorizationForRenewal(client, medicationId);

    if (previousAuthorization) {
      throw new AppError(
        'Este medicamento ya tiene una autorización registrada. Usa la opción de renovación cuando la autorización actual se haya agotado.',
        409
      );
    }

    const prepared = { ...data, previousAuthorizationId: null };

    return finalizeNewAuthorization(client, { member, medication, medicationId, memberId, userId, prepared });
  });
}

// Atajo de conveniencia: crea una autorización nueva heredando los datos de
// configuración (EPS, farmacia, teléfono/web de renovación) de la anterior,
// para cuando el usuario solo necesita renovar el período y la cantidad.
export async function renewAuthorization(memberId, medicationId, userId, data = {}) {
  return withTransaction(async (client) => {
    const { member } = await assertCanManageMember(client, memberId, userId);
    const medication = await getMedicationOrFail(client, medicationId, memberId);
    const previous = await repository.findPreviousAuthorizationForRenewal(client, medicationId);
    if (!previous) throw new AppError('No existe una autorización previa para renovar.', 422);

    if (!previous.canceled_at && Number(previous.remaining_quantity ?? 0) > 0) {
      throw new AppError(
        'La autorización actual todavía tiene entregas disponibles. Solo puedes registrar una nueva autorización cuando se hayan agotado, o anular la actual primero.',
        409
      );
    }

    const prepared = {
      previousAuthorizationId: previous.id,
      epsId: data.epsId ?? null,
      authorizationNumber: data.authorizationNumber ?? null,
      authorizationDate: data.authorizationDate ?? null,
      validFrom: data.validFrom ?? null,
      validTo: data.validTo ?? null,
      totalAuthorizedQuantity: data.totalAuthorizedQuantity ?? null,
      remainingQuantity: data.remainingQuantity ?? data.totalAuthorizedQuantity ?? null,
      isHighCost: data.isHighCost ?? previous.is_high_cost,
      renewalDaysBefore: data.renewalDaysBefore ?? previous.renewal_days_before,
      renewalPeriodicity: data.renewalPeriodicity ?? previous.renewal_periodicity,
      renewalPhone: data.renewalPhone ?? previous.renewal_phone,
      renewalWebsite: data.renewalWebsite ?? previous.renewal_website,
      renewalChannel: data.renewalChannel ?? previous.renewal_channel,
      pharmacyName: data.pharmacyName ?? previous.pharmacy_name,
      pharmacyAddress: data.pharmacyAddress ?? previous.pharmacy_address,
      pharmacyPhone: data.pharmacyPhone ?? previous.pharmacy_phone,
      pharmacyWebsite: data.pharmacyWebsite ?? previous.pharmacy_website,
      notes: data.notes ?? previous.notes
    };

    return finalizeNewAuthorization(client, { member, medication, medicationId, memberId, userId, prepared });
  });
}

export async function updateAuthorization(memberId, medicationId, authorizationId, userId, data) {
  return withTransaction(async (client) => {
    const { member } = await assertCanManageMember(client, memberId, userId);
    await getMedicationOrFail(client, medicationId, memberId);
    const before = await repository.findAuthorizationById(client, authorizationId, medicationId, true);
    if (!before) throw new AppError('Autorización no encontrada.', 404);

    if (data.epsId) {
      const eps = await repository.findActiveEps(client, data.epsId);
      if (!eps) throw new AppError('La EPS seleccionada no existe o está inactiva.', 422);
    }

    const authorization = await repository.updateAuthorization(client, authorizationId, medicationId, data);
    if (!authorization) throw new AppError('Autorización no encontrada.', 404);

    // Los datos de farmacia se copian a cada entrega en el momento en que se
    // genera (para conservar historial en las ya recogidas/perdidas), pero
    // la entrega ABIERTA actual debe reflejar siempre la información más
    // reciente de la autorización, no la foto vieja del momento en que se
    // generó.
    const pharmacyFieldsChanged = ['pharmacyName', 'pharmacyAddress', 'pharmacyPhone', 'pharmacyWebsite'].some(
      (field) => field in data
    );
    if (pharmacyFieldsChanged) {
      const openDelivery = await repository.findOpenDeliveryForAuthorization(client, authorizationId, medicationId, true);
      if (openDelivery) {
        await repository.updateDeliveryPharmacyInfo(client, openDelivery.id, medicationId, {
          pharmacyName: authorization.pharmacy_name,
          pharmacyAddress: authorization.pharmacy_address,
          pharmacyPhone: authorization.pharmacy_phone,
          pharmacyWebsite: authorization.pharmacy_website
        });
      }
    }

    // Este endpoint NUNCA toca medications.management_status. Solo registra
    // en el historial cuando la configuración pasa de PENDIENTE a CONFIGURADA,
    // como un evento informativo.
    const wasConfigured = getConfigurationStatus(before) === 'CONFIGURADA';
    const isConfigured = getConfigurationStatus(authorization) === 'CONFIGURADA';
    if (!wasConfigured && isConfigured) {
      await repository.insertProcessHistory(client, {
        medicationId,
        authorizationId,
        eventType: 'TRAMITE_CONFIGURADO',
        userId,
        notes: 'Se completaron los datos de renovación y farmacia de la autorización.'
      });
    }

    await writeAuditLog(client, {
      userId,
      familyId: member.family_id,
      action: 'UPDATE',
      entity: AUTH_ENTITY,
      entityId: authorizationId,
      changes: { old: before, new: authorization, medicationId }
    });

    return decorateAuthorization(authorization);
  });
}

// La entrega abierta de esta autorización específica (si existe) también se
// cancela: ya no aplica, sin importar en qué status estuviera.
export async function cancelAuthorization(memberId, medicationId, authorizationId, userId, reason) {
  return withTransaction(async (client) => {
    const { member } = await assertCanManageMember(client, memberId, userId);
    await getMedicationOrFail(client, medicationId, memberId);
    const before = await repository.findAuthorizationById(client, authorizationId, medicationId, true);
    if (!before) throw new AppError('Autorización no encontrada.', 404);
    if (before.canceled_at) throw new AppError('Esta autorización ya fue anulada.', 409);

    const authorization = await repository.cancelAuthorization(client, authorizationId, medicationId, {
      reason,
      userId
    });

    const openDelivery = await repository.findOpenDeliveryForAuthorization(client, authorizationId, medicationId, true);
    let canceledDelivery = null;

    if (openDelivery) {
      canceledDelivery = await repository.markDeliveryCanceled(client, openDelivery.id, medicationId);
      // La entrega abierta que se está cancelando era la que gobernaba el
      // management_status del medicamento; al desaparecer, el medicamento
      // queda sin trámite vigente hasta que se registre una autorización nueva.
      await repository.updateMedicationManagementStatus(client, medicationId, 'SIN_AUTORIZACION_VIGENTE');
    }

    await repository.insertProcessHistory(client, {
      medicationId,
      authorizationId,
      deliveryId: canceledDelivery?.id ?? null,
      eventType: 'TRAMITE_CANCELADO',
      userId,
      notes: reason ?? 'Autorización anulada por el usuario.'
    });

    await writeAuditLog(client, {
      userId,
      familyId: member.family_id,
      action: 'UPDATE',
      entity: AUTH_ENTITY,
      entityId: authorizationId,
      changes: { old: before, new: authorization, medicationId, reason: reason ?? null }
    });

    if (canceledDelivery) {
      await writeAuditLog(client, {
        userId,
        familyId: member.family_id,
        action: 'UPDATE',
        entity: DELIVERY_ENTITY,
        entityId: canceledDelivery.id,
        changes: { old: openDelivery, new: canceledDelivery, medicationId, reason: 'Cancelada junto con la autorización' }
      });
    }

    return {
      ...decorateAuthorization(authorization),
      alert: buildAuthorizationAlert(authorization)
    };
  });
}

// ----------------------------------------------------------------------------
// Entregas (solo lectura + transiciones de estado; nunca creación/edición libre)
// ----------------------------------------------------------------------------

export async function listDeliveries(memberId, medicationId, userId, query) {
  return withTransaction(async (client) => {
    await assertCanViewMember(client, memberId, userId);
    await getMedicationOrFail(client, medicationId, memberId);
    return repository.listDeliveries(client, medicationId, query);
  });
}

export async function getDelivery(memberId, medicationId, deliveryId, userId) {
  return withTransaction(async (client) => {
    await assertCanViewMember(client, memberId, userId);
    await getMedicationOrFail(client, medicationId, memberId);
    const delivery = await repository.findDeliveryById(client, deliveryId, medicationId);
    if (!delivery) throw new AppError('Entrega no encontrada.', 404);
    return delivery;
  });
}

// El usuario fue a la farmacia, no había stock, le dieron el comprobante.
export async function markPendingPharmacy(memberId, medicationId, deliveryId, userId) {
  return withTransaction(async (client) => {
    const { member } = await assertCanManageMember(client, memberId, userId);
    await getMedicationOrFail(client, medicationId, memberId);
    const before = await repository.findDeliveryById(client, deliveryId, medicationId, true);
    if (!before) throw new AppError('Entrega no encontrada.', 404);
    if (before.status !== 'LISTO_PARA_RECOGER') {
      throw new AppError('Solo una entrega en LISTO_PARA_RECOGER puede pasar a PENDIENTE_FARMACIA.', 422);
    }

    const delivery = await repository.markDeliveryPendingPharmacy(client, deliveryId, medicationId);
    await repository.insertProcessHistory(client, {
      medicationId,
      deliveryId,
      authorizationId: delivery.authorization_id,
      eventType: 'ENTREGA_PENDIENTE_FARMACIA',
      userId,
      notes: 'La farmacia no tenía existencias; se recibió comprobante de reserva.'
    });

    await writeAuditLog(client, {
      userId,
      familyId: member.family_id,
      action: 'UPDATE',
      entity: DELIVERY_ENTITY,
      entityId: deliveryId,
      changes: { old: before, new: delivery, medicationId }
    });

    return delivery;
  });
}

// El usuario ya hizo la gestión de renovación pendiente; la entrega queda
// lista para recoger. (RENOVACION_PENDIENTE -> LISTO_PARA_RECOGER, manual.)
export async function confirmRenewalManaged(memberId, medicationId, deliveryId, userId) {
  return withTransaction(async (client) => {
    const { member } = await assertCanManageMember(client, memberId, userId);
    await getMedicationOrFail(client, medicationId, memberId);
    const before = await repository.findDeliveryById(client, deliveryId, medicationId, true);
    if (!before) throw new AppError('Entrega no encontrada.', 404);
    if (before.status !== 'RENOVACION_PENDIENTE') {
      throw new AppError('Solo una entrega en RENOVACION_PENDIENTE puede confirmarse como gestionada.', 422);
    }

    const delivery = await repository.markDeliveryManaged(client, deliveryId, medicationId);
    await repository.updateMedicationManagementStatus(client, medicationId, 'LISTO_PARA_RECOGER');
    await repository.insertProcessHistory(client, {
      medicationId,
      deliveryId,
      authorizationId: delivery.authorization_id,
      eventType: 'LISTO_PARA_RECOGER',
      userId,
      notes: 'El usuario confirmó que ya gestionó la renovación.'
    });

    await notifyPickupReady(client, medicationId, deliveryId);

    await writeAuditLog(client, {
      userId,
      familyId: member.family_id,
      action: 'UPDATE',
      entity: DELIVERY_ENTITY,
      entityId: deliveryId,
      changes: { old: before, new: delivery, medicationId }
    });

    return delivery;
  });
}

export async function collectDelivery(memberId, medicationId, deliveryId, userId, data) {
  return withTransaction(async (client) => {
    const { member } = await assertCanManageMember(client, memberId, userId);
    const medication = await getMedicationOrFail(client, medicationId, memberId);
    const before = await repository.findDeliveryById(client, deliveryId, medicationId, true);
    if (!before) throw new AppError('Entrega no encontrada.', 404);

    if (!['LISTO_PARA_RECOGER', 'PENDIENTE_FARMACIA'].includes(before.status)) {
      throw new AppError('Solo una entrega LISTO_PARA_RECOGER o PENDIENTE_FARMACIA puede marcarse como recogida.', 422);
    }

    const pickedUpDate = getValidDate(data.pickedUpDate);
    if (pickedUpDate > getValidDate(todayDateString())) {
      throw new AppError('pickedUpDate no puede ser una fecha futura.', 422);
    }

    const delivery = await repository.markDeliveryCollected(client, deliveryId, medicationId, data.pickedUpDate, data.notes);

    await repository.insertProcessHistory(client, {
      medicationId,
      deliveryId,
      authorizationId: delivery.authorization_id,
      eventType: 'ENTREGA_RECOGIDA',
      userId,
      notes: `Entrega recogida el ${data.pickedUpDate}.`
    });

    await closeDeliveryCycle(client, {
      medication,
      delivery,
      userId,
      baseDate: data.pickedUpDate,
      lost: false
    });

    await writeAuditLog(client, {
      userId,
      familyId: member.family_id,
      action: 'UPDATE',
      entity: DELIVERY_ENTITY,
      entityId: deliveryId,
      changes: { old: before, new: delivery, medicationId }
    });

    return repository.findDeliveryById(client, deliveryId, medicationId);
  });
}

// ----------------------------------------------------------------------------
// Funciones usadas exclusivamente por el cron (medicationProcess.cron.js)
// No se exponen por HTTP: no hay usuario ni family_member en ese contexto.
// ----------------------------------------------------------------------------

export async function runRenewalReminderTransition(client, { deliveryId, medicationId }) {
  const delivery = await repository.findDeliveryById(client, deliveryId, medicationId, true);
  if (!delivery || delivery.status !== 'PROGRAMADA') return;

  await repository.markDeliveryRenewalPending(client, deliveryId, medicationId);
  await repository.updateMedicationManagementStatus(client, medicationId, 'REQUIERE_RENOVACION');
  await repository.insertProcessHistory(client, {
    medicationId,
    deliveryId,
    authorizationId: delivery.authorization_id,
    eventType: 'RENOVACION_REQUERIDA',
    notes: 'Se acerca la fecha de la próxima entrega; se requiere gestionar la renovación.'
  });

  await notifyRecipients(client, medicationId, {
    notificationType: 'RENOVACION_MEDICAMENTO',
    title: ({ medicationName, memberName, isRecipientTheMedicationOwner }) =>
      isRecipientTheMedicationOwner
        ? `Próxima entrega de ${medicationName}`
        : `Próxima entrega de ${medicationName} para ${memberName}`,
    body: ({ medicationName, memberName, isRecipientTheMedicationOwner }) =>
      isRecipientTheMedicationOwner
        ? `Se acerca la fecha de tu próxima entrega de ${medicationName}. Recuerda realizar la gestión necesaria con anticipación.`
        : `Se acerca la fecha de la próxima entrega de ${medicationName} para ${memberName}. Recuerda realizar la gestión necesaria con anticipación.`,
    entityId: deliveryId
  });
}

export async function runOverdueRenewalNotification(client, { deliveryId, medicationId }) {
  const delivery = await repository.findDeliveryById(client, deliveryId, medicationId);
  if (!delivery || delivery.status !== 'RENOVACION_PENDIENTE') return;

  await notifyRecipients(client, medicationId, {
    notificationType: 'ENTREGA_MEDICAMENTO',
    title: ({ medicationName, memberName, isRecipientTheMedicationOwner }) =>
      isRecipientTheMedicationOwner
        ? `Debes gestionar la entrega de ${medicationName}`
        : `Debes gestionar la entrega de ${medicationName} para ${memberName}`,
    body: ({ medicationName, memberName, isRecipientTheMedicationOwner }) =>
      isRecipientTheMedicationOwner
        ? `La fecha programada para recoger ${medicationName} ya pasó y aún no gestionas la renovación. Realízala lo antes posible para no perder esta entrega.`
        : `La fecha programada para recoger ${medicationName} para ${memberName} ya pasó y aún no se ha gestionado la renovación. Realiza la gestión lo antes posible para no perder esta entrega.`,
    entityId: deliveryId
  });
}

export async function runDeliveryLossTransition(
  client,
  { deliveryId, medicationId, referenceDate = todayDateString() }
) {
  const medication = await repository.findMedicationById(client, medicationId);
  if (!medication) return;

  const delivery = await repository.findDeliveryById(client, deliveryId, medicationId, true);
  if (!delivery) return;
  if (!['PROGRAMADA', 'RENOVACION_PENDIENTE', 'LISTO_PARA_RECOGER'].includes(delivery.status)) return;
  if (!delivery.pickup_deadline || delivery.pickup_deadline >= referenceDate) return;

  const note = `Entrega perdida: no se recogió antes del ${formatDate(new Date(delivery.pickup_deadline))}.`;
  await repository.markDeliveryLost(client, deliveryId, medicationId, note);
  await repository.insertProcessHistory(client, {
    medicationId,
    deliveryId,
    authorizationId: delivery.authorization_id,
    eventType: 'ENTREGA_PERDIDA',
    notes: note
  });

  await closeDeliveryCycle(client, {
    medication,
    delivery,
    userId: null,
    baseDate: formatDate(new Date(delivery.scheduled_date)),
    lost: true
  });

  await notifyRecipients(client, medicationId, {
    notificationType: 'ENTREGA_MEDICAMENTO',
    title: ({ medicationName, memberName, isRecipientTheMedicationOwner }) =>
      isRecipientTheMedicationOwner
        ? `Se perdió una entrega de ${medicationName}`
        : `Se perdió una entrega de ${medicationName} para ${memberName}`,
    body: ({ medicationName, memberName, isRecipientTheMedicationOwner }) =>
      isRecipientTheMedicationOwner
        ? `No se recogió ${medicationName} antes de la fecha límite (${formatDate(new Date(delivery.pickup_deadline))}). ${note}`
        : `No se recogió ${medicationName} para ${memberName} antes de la fecha límite (${formatDate(new Date(delivery.pickup_deadline))}). ${note}`,
    entityId: deliveryId
  });
}

// El barrido diario reintenta el aviso de las entregas que ya estaban en
// LISTO_PARA_RECOGER antes de desplegar las notificaciones. Es idempotente:
// notifyRecipients evita crear otra fila para el mismo destinatario y título.
export async function runReadyForPickupNotice(client, { deliveryId, medicationId }) {
  const delivery = await repository.findDeliveryById(client, deliveryId, medicationId, true);
  if (!delivery || delivery.status !== 'LISTO_PARA_RECOGER') return;
  await notifyPickupReady(client, medicationId, deliveryId);
}

// Aviso adicional al acercarse la fecha límite de recogida (hoy o mañana).
export async function runPickupDeadlineReminder(client, { deliveryId, medicationId }) {
  const delivery = await repository.findDeliveryById(client, deliveryId, medicationId, true);
  if (!delivery || delivery.status !== 'LISTO_PARA_RECOGER' || !delivery.pickup_deadline) return;

  const deadline = formatDate(delivery.pickup_deadline);
  await notifyRecipients(client, medicationId, {
    notificationType: 'ENTREGA_MEDICAMENTO',
    title: ({ medicationName, memberName, isRecipientTheMedicationOwner }) =>
      isRecipientTheMedicationOwner
        ? `Recuerda recoger ${medicationName}`
        : `Recoge ${medicationName} para ${memberName}`,
    body: ({ medicationName, memberName, isRecipientTheMedicationOwner }) =>
      isRecipientTheMedicationOwner
        ? `La fecha límite para recoger ${medicationName} es ${deadline}. Revisa la farmacia registrada y recógelo antes de esa fecha.`
        : `La fecha límite para recoger ${medicationName} para ${memberName} es ${deadline}. Revisa la farmacia registrada y recógelo antes de esa fecha.`,
    entityId: deliveryId
  });
}

// ----------------------------------------------------------------------------
// Historial y resumen
// ----------------------------------------------------------------------------

export async function listProcessHistory(memberId, medicationId, userId, limit) {
  return withTransaction(async (client) => {
    await assertCanViewMember(client, memberId, userId);
    await getMedicationOrFail(client, medicationId, memberId);
    return repository.listProcessHistory(client, medicationId, limit);
  });
}

export async function getSummary(memberId, medicationId, userId) {
  return withTransaction(async (client) => {
    await assertCanViewMember(client, memberId, userId);
    const medication = await getMedicationOrFail(client, medicationId, memberId);
    const [authorizations, deliveries, history] = await Promise.all([
      repository.listAuthorizations(client, medicationId, 10),
      repository.listDeliveries(client, medicationId, { limit: 50 }),
      repository.listProcessHistory(client, medicationId, 20)
    ]);

    const currentAuthorization = authorizations[0] ?? null;

    return {
      medication: {
        id: medication.id,
        name: medication.name,
        managementStatus: medication.management_status
      },
      currentAuthorization: currentAuthorization
        ? {
            ...decorateAuthorization(currentAuthorization),
            alert: buildAuthorizationAlert(currentAuthorization)
          }
        : null,
      authorizations: authorizations.map(decorateAuthorization),
      deliveries,
      history
    };
  });
}