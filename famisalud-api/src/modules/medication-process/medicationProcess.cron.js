// ============================================================================
// Barrido diario del módulo de Trámites de Medicamentos.
//
// Corre una vez al día (recomendado: madrugada, ej. 00:30 hora de Bogotá).
// Aplica las transiciones de estado que dependen de la fecha de hoy, y que
// por eso no pueden esperar a que alguien abra la app:
//
//   1. PROGRAMADA -> RENOVACION_PENDIENTE
//      cuando faltan renewal_days_before días para scheduled_date.
//   2. Aviso urgente (sin cambio de estado)
//      cuando una entrega sigue en RENOVACION_PENDIENTE y ya se pasó su
//      scheduled_date.
//   3. PROGRAMADA / RENOVACION_PENDIENTE / LISTO_PARA_RECOGER -> PERDIDA
//      cuando ya pasó pickup_deadline. PENDIENTE_FARMACIA queda excluida a
//      propósito: nunca vence por sí sola.
//   4. Recupera avisos de entregas que ya estaban LISTO_PARA_RECOGER sin aviso
//      y recuerda recogidas cuya fecha límite es hoy o mañana.
//
// Toda la lógica de negocio (descuento de remaining_quantity, generación de
// la siguiente entrega, notificaciones) vive en medicationProcess.service.js.
// Este archivo solo encuentra los candidatos y llama al service, uno por
// uno, cada uno en su propia transacción para que un error en una entrega
// no tumbe el resto del barrido.
//
// Instalación (pendiente de decidir con el resto del equipo/infraestructura):
//   Con node-cron, por ejemplo:
//     import cron from 'node-cron';
//     cron.schedule('30 0 * * *', () => runDailyProcessSweep().catch(console.error), {
//       timezone: 'America/Bogota'
//     });
// ============================================================================

import { pool } from '../../config/database.js';
import * as repository from './medicationProcess.repository.js';
import {
  runRenewalReminderTransition,
  runOverdueRenewalNotification,
  runDeliveryLossTransition,
  runReadyForPickupNotice,
  runPickupDeadlineReminder
} from './medicationProcess.service.js';

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

async function withOwnClient(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await fn(client);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Cada candidato se procesa en su propia transacción y con manejo de error
// aislado: si uno falla (ej. una carrera con una acción del usuario en ese
// mismo instante), se reporta y se sigue con los demás en vez de abortar
// todo el barrido.
async function processEach(items, handler) {
  const errors = [];
  for (const item of items) {
    try {
      await withOwnClient((client) => handler(client, item));
    } catch (error) {
      errors.push({ item, error });
    }
  }
  return errors;
}

export async function runDailyProcessSweep({ referenceDate = todayDateString() } = {}) {
  const readClient = await pool.connect();
  let reminderCandidates;
  let overdueCandidates;
  let deadlineCandidates;
  let readyForPickupCandidates;
  let pickupDeadlineCandidates;

  try {
    reminderCandidates = await repository.listDeliveriesDueForRenewalReminder(readClient, referenceDate);
    overdueCandidates = await repository.listOverdueUnrenewedDeliveries(readClient, referenceDate);
    deadlineCandidates = await repository.listDeliveriesPastDeadline(readClient, referenceDate);
    readyForPickupCandidates = await repository.listDeliveriesReadyForPickupNotice(readClient);
    pickupDeadlineCandidates = await repository.listDeliveriesNearPickupDeadline(readClient, referenceDate);
  } finally {
    readClient.release();
  }

  const reminderErrors = await processEach(reminderCandidates, (client, row) =>
    runRenewalReminderTransition(client, { deliveryId: row.id, medicationId: row.medication_id })
  );

  const overdueErrors = await processEach(overdueCandidates, (client, row) =>
    runOverdueRenewalNotification(client, { deliveryId: row.id, medicationId: row.medication_id })
  );

  const lossErrors = await processEach(deadlineCandidates, (client, row) =>
    runDeliveryLossTransition(client, {
      deliveryId: row.id,
      medicationId: row.medication_id,
      referenceDate
    })
  );

  const readyForPickupErrors = await processEach(readyForPickupCandidates, (client, row) =>
    runReadyForPickupNotice(client, { deliveryId: row.id, medicationId: row.medication_id })
  );

  const pickupDeadlineErrors = await processEach(pickupDeadlineCandidates, (client, row) =>
    runPickupDeadlineReminder(client, { deliveryId: row.id, medicationId: row.medication_id })
  );

  const summary = {
    referenceDate,
    renewalReminders: { processed: reminderCandidates.length, errors: reminderErrors.length },
    overdueNotifications: { processed: overdueCandidates.length, errors: overdueErrors.length },
    lostDeliveries: { processed: deadlineCandidates.length, errors: lossErrors.length },
    readyForPickupNotices: { processed: readyForPickupCandidates.length, errors: readyForPickupErrors.length },
    pickupDeadlineReminders: { processed: pickupDeadlineCandidates.length, errors: pickupDeadlineErrors.length }
  };

  const allErrors = [...reminderErrors, ...overdueErrors, ...lossErrors, ...readyForPickupErrors, ...pickupDeadlineErrors];
  if (allErrors.length > 0) {
    // eslint-disable-next-line no-console
    console.error('[medicationProcess.cron] errores durante el barrido diario:', allErrors);
  }
  // eslint-disable-next-line no-console
  console.log('[medicationProcess.cron] barrido diario completado:', summary);

  return summary;
}
