const AUTH_SELECT = `
  ma.id, ma.medication_id,
  ma.previous_authorization_id,
  ma.eps_id,
  e.name AS eps_name,
  e.code AS eps_code,
  ma.authorization_number,
  ma.authorization_date,
  ma.valid_from,
  ma.valid_to,
  ma.total_authorized_quantity,
  ma.remaining_quantity,
  ma.is_high_cost,
  ma.renewal_days_before,
  ma.renewal_periodicity,
  ma.renewal_phone,
  ma.renewal_website,
  ma.renewal_channel,
  ma.pharmacy_name,
  ma.pharmacy_address,
  ma.pharmacy_phone,
  ma.pharmacy_website,
  ma.notes,
  ma.canceled_at,
  ma.cancellation_reason,
  ma.canceled_by_user_id,
  ma.created_at,
  ma.updated_at
`;

const DELIVERY_SELECT = `
  md.id, md.medication_id, md.authorization_id,
  ma.authorization_number,
  md.delivery_number,
  md.scheduled_date,
  md.pickup_deadline,
  md.picked_up_date,
  md.status,
  md.pharmacy_name,
  md.pharmacy_address,
  md.pharmacy_phone,
  md.pharmacy_website,
  md.delivery_notes,
  md.created_at,
  md.updated_at
`;

export async function findMedication(client, medicationId, memberId) {
  const result = await client.query(
    `SELECT id, member_id, name, dose_amount, dose_unit, instructions,
            start_date, end_date, clinical_status, management_status
     FROM medications
     WHERE id = $1 AND member_id = $2 AND deleted_at IS NULL
     LIMIT 1`,
    [medicationId, memberId]
  );
  return result.rows[0] ?? null;
}

// Usado por el cron: no depende de memberId porque el barrido diario opera
// sobre todo el sistema, no dentro de una petición de un usuario.
export async function findMedicationById(client, medicationId) {
  const result = await client.query(
    `SELECT id, member_id, name, clinical_status, management_status
     FROM medications
     WHERE id = $1 AND deleted_at IS NULL
     LIMIT 1`,
    [medicationId]
  );
  return result.rows[0] ?? null;
}

export async function listAuthorizations(client, medicationId, limit) {
  const result = await client.query(
    `SELECT ${AUTH_SELECT}
     FROM medication_authorizations ma
     LEFT JOIN eps_companies e ON e.id = ma.eps_id
     WHERE ma.medication_id = $1
     ORDER BY ma.created_at DESC
     LIMIT $2`,
    [medicationId, limit]
  );
  return result.rows;
}

export async function findAuthorizationById(client, authorizationId, medicationId, forUpdate = false) {
  const result = await client.query(
    `SELECT ${AUTH_SELECT}
     FROM medication_authorizations ma
     LEFT JOIN eps_companies e ON e.id = ma.eps_id
     WHERE ma.id = $1 AND ma.medication_id = $2
     LIMIT 1${forUpdate ? ' FOR UPDATE OF ma' : ''}`,
    [authorizationId, medicationId]
  );
  return result.rows[0] ?? null;
}

export async function findActiveEps(client, epsId) {
  const result = await client.query(
    `SELECT id, name, code FROM eps_companies WHERE id = $1 AND is_active = TRUE LIMIT 1`,
    [epsId]
  );
  return result.rows[0] ?? null;
}

export async function createAuthorization(client, medicationId, data = {}) {
  const payload = data ?? {};
  const result = await client.query(
    `INSERT INTO medication_authorizations (
      medication_id, previous_authorization_id, eps_id,
      authorization_number, authorization_date, valid_from, valid_to,
      total_authorized_quantity, remaining_quantity, is_high_cost,
      renewal_days_before, renewal_periodicity,
      renewal_phone, renewal_website, renewal_channel,
      pharmacy_name, pharmacy_address, pharmacy_phone, pharmacy_website,
      notes
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
    RETURNING id`,
    [
      medicationId,
      payload.previousAuthorizationId ?? null,
      payload.epsId ?? null,
      payload.authorizationNumber ?? null,
      payload.authorizationDate ?? null,
      payload.validFrom ?? null,
      payload.validTo ?? null,
      payload.totalAuthorizedQuantity ?? null,
      payload.remainingQuantity ?? null,
      payload.isHighCost ?? false,
      payload.renewalDaysBefore ?? null,
      payload.renewalPeriodicity ?? 'MENSUAL',
      payload.renewalPhone ?? null,
      payload.renewalWebsite ?? null,
      payload.renewalChannel ?? null,
      payload.pharmacyName ?? null,
      payload.pharmacyAddress ?? null,
      payload.pharmacyPhone ?? null,
      payload.pharmacyWebsite ?? null,
      payload.notes ?? null
    ]
  );
  return findAuthorizationById(client, result.rows[0].id, medicationId);
}

export async function updateAuthorization(client, authorizationId, medicationId, data) {
  const fields = {
    epsId: 'eps_id',
    authorizationNumber: 'authorization_number',
    authorizationDate: 'authorization_date',
    validFrom: 'valid_from',
    validTo: 'valid_to',
    totalAuthorizedQuantity: 'total_authorized_quantity',
    remainingQuantity: 'remaining_quantity',
    isHighCost: 'is_high_cost',
    renewalDaysBefore: 'renewal_days_before',
    renewalPeriodicity: 'renewal_periodicity',
    renewalPhone: 'renewal_phone',
    renewalWebsite: 'renewal_website',
    renewalChannel: 'renewal_channel',
    pharmacyName: 'pharmacy_name',
    pharmacyAddress: 'pharmacy_address',
    pharmacyPhone: 'pharmacy_phone',
    pharmacyWebsite: 'pharmacy_website',
    notes: 'notes'
  };

  const entries = Object.entries(data).filter(([key, value]) => key in fields && value !== undefined);
  if (!entries.length) return findAuthorizationById(client, authorizationId, medicationId);

  const assignments = entries.map(([key], index) => `${fields[key]} = $${index + 3}`);
  const values = entries.map(([, value]) => value ?? null);

  const result = await client.query(
    `UPDATE medication_authorizations
     SET ${assignments.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND medication_id = $2
     RETURNING id`,
    [authorizationId, medicationId, ...values]
  );

  if (!result.rows[0]) return null;
  return findAuthorizationById(client, authorizationId, medicationId);
}

export async function decrementRemainingQuantity(client, authorizationId, medicationId) {
  const result = await client.query(
    `UPDATE medication_authorizations
     SET remaining_quantity = GREATEST(COALESCE(remaining_quantity, 0) - 1, 0),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND medication_id = $2
     RETURNING id`,
    [authorizationId, medicationId]
  );
  if (!result.rows[0]) return null;
  return findAuthorizationById(client, authorizationId, medicationId);
}

export async function getNextAuthorizationNumber(client, medicationId) {
  const result = await client.query(
    `SELECT COUNT(*) + 1 AS next_number FROM medication_authorizations WHERE medication_id = $1`,
    [medicationId]
  );
  return Number(result.rows[0].next_number);
}

// Busca una solicitud de autorización (evento AUTORIZACION_SOLICITADA) que
// todavía no haya sido resuelta por ninguna autorización registrada después
// de ella. Se usa para que authorization_date, si no se envía, tome la
// fecha en la que realmente se solicitó (en vez de la fecha de hoy).
export async function findLatestUnfulfilledAuthorizationRequest(client, medicationId) {
  const result = await client.query(
    `SELECT mph.created_at
     FROM medication_process_history mph
     WHERE mph.medication_id = $1
       AND mph.event_type = 'AUTORIZACION_SOLICITADA'
       AND mph.created_at > COALESCE(
         (SELECT MAX(created_at) FROM medication_authorizations WHERE medication_id = $1),
         '-infinity'::timestamptz
       )
     ORDER BY mph.created_at DESC
     LIMIT 1`,
    [medicationId]
  );
  return result.rows[0]?.created_at ?? null;
}

export async function updateDeliveryPharmacyInfo(client, deliveryId, medicationId, data) {
  const result = await client.query(
    `UPDATE medication_deliveries
     SET pharmacy_name = $3,
         pharmacy_address = $4,
         pharmacy_phone = $5,
         pharmacy_website = $6,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND medication_id = $2
     RETURNING id`,
    [deliveryId, medicationId, data.pharmacyName ?? null, data.pharmacyAddress ?? null, data.pharmacyPhone ?? null, data.pharmacyWebsite ?? null]
  );
  if (!result.rows[0]) return null;
  return findDeliveryById(client, deliveryId, medicationId);
}

export async function findPreviousAuthorizationForRenewal(client, medicationId) {
  const result = await client.query(
    `SELECT ${AUTH_SELECT}
     FROM medication_authorizations ma
     LEFT JOIN eps_companies e ON e.id = ma.eps_id
     WHERE ma.medication_id = $1
     ORDER BY ma.created_at DESC
     LIMIT 1
     FOR UPDATE OF ma`,
    [medicationId]
  );
  return result.rows[0] ?? null;
}

export async function cancelAuthorization(client, authorizationId, medicationId, { reason, userId }) {
  const result = await client.query(
    `UPDATE medication_authorizations
     SET canceled_at = CURRENT_TIMESTAMP,
         cancellation_reason = $3,
         canceled_by_user_id = $4,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND medication_id = $2
     RETURNING id`,
    [authorizationId, medicationId, reason ?? null, userId ?? null]
  );
  if (!result.rows[0]) return null;
  return findAuthorizationById(client, authorizationId, medicationId);
}

// La entrega abierta actual de una autorización específica (no del
// medicamento en general), usada al anular: si existe, también se cancela.
export async function findOpenDeliveryForAuthorization(client, authorizationId, medicationId, forUpdate = false) {
  const openStatuses = ['PROGRAMADA', 'RENOVACION_PENDIENTE', 'LISTO_PARA_RECOGER', 'PENDIENTE_FARMACIA'];
  const result = await client.query(
    `SELECT ${DELIVERY_SELECT}
     FROM medication_deliveries md
     LEFT JOIN medication_authorizations ma ON ma.id = md.authorization_id
     WHERE md.authorization_id = $1 AND md.medication_id = $2 AND md.status = ANY($3::delivery_status_enum[])
     ORDER BY md.delivery_number DESC
     LIMIT 1${forUpdate ? ' FOR UPDATE OF md' : ''}`,
    [authorizationId, medicationId, openStatuses]
  );
  return result.rows[0] ?? null;
}

export async function markDeliveryCanceled(client, deliveryId, medicationId) {
  const result = await client.query(
    `UPDATE medication_deliveries
     SET status = 'CANCELADO',
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND medication_id = $2
     RETURNING id`,
    [deliveryId, medicationId]
  );
  if (!result.rows[0]) return null;
  return findDeliveryById(client, deliveryId, medicationId);
}

export async function listDeliveries(client, medicationId, { status, limit }) {
  const params = [medicationId];
  let where = 'md.medication_id = $1';

  if (status) {
    params.push(status);
    where += ` AND md.status = $${params.length}`;
  }

  params.push(limit);

  const result = await client.query(
    `SELECT ${DELIVERY_SELECT}
     FROM medication_deliveries md
     LEFT JOIN medication_authorizations ma ON ma.id = md.authorization_id
     WHERE ${where}
     ORDER BY md.delivery_number DESC, md.created_at DESC
     LIMIT $${params.length}`,
    params
  );

  return result.rows;
}

export async function findDeliveryById(client, deliveryId, medicationId, forUpdate = false) {
  const result = await client.query(
    `SELECT ${DELIVERY_SELECT}
     FROM medication_deliveries md
     LEFT JOIN medication_authorizations ma ON ma.id = md.authorization_id
     WHERE md.id = $1 AND md.medication_id = $2
     LIMIT 1${forUpdate ? ' FOR UPDATE OF md' : ''}`,
    [deliveryId, medicationId]
  );
  return result.rows[0] ?? null;
}

// Usado por el cron: la entrega abierta más reciente de cada medicamento,
// sin necesitar memberId (el barrido corre fuera del contexto de un usuario).
export async function findOpenDeliveryByStatuses(client, medicationId, statuses, forUpdate = false) {
  const result = await client.query(
    `SELECT ${DELIVERY_SELECT}
     FROM medication_deliveries md
     LEFT JOIN medication_authorizations ma ON ma.id = md.authorization_id
     WHERE md.medication_id = $1 AND md.status = ANY($2::delivery_status_enum[])
     ORDER BY md.delivery_number DESC
     LIMIT 1${forUpdate ? ' FOR UPDATE OF md' : ''}`,
    [medicationId, statuses]
  );
  return result.rows[0] ?? null;
}

// Candidatos para el barrido diario. Se listan sin transacción abierta;
// el service abre una transacción propia por cada entrega procesada.
export async function listDeliveriesDueForRenewalReminder(client, referenceDate) {
  const result = await client.query(
    `SELECT md.id, md.medication_id, md.scheduled_date, ma.renewal_days_before
     FROM medication_deliveries md
     JOIN medication_authorizations ma ON ma.id = md.authorization_id
     WHERE md.status = 'PROGRAMADA'
       AND md.scheduled_date IS NOT NULL
       AND ma.renewal_days_before IS NOT NULL
       AND md.scheduled_date - (ma.renewal_days_before || ' days')::interval <= $1::date`,
    [referenceDate]
  );
  return result.rows;
}

export async function listOverdueUnrenewedDeliveries(client, referenceDate) {
  const result = await client.query(
    `SELECT md.id, md.medication_id, md.scheduled_date
     FROM medication_deliveries md
     WHERE md.status = 'RENOVACION_PENDIENTE'
       AND md.scheduled_date IS NOT NULL
       AND md.scheduled_date <= $1::date`,
    [referenceDate]
  );
  return result.rows;
}

export async function listDeliveriesPastDeadline(client, referenceDate) {
  const result = await client.query(
    `SELECT md.id, md.medication_id
     FROM medication_deliveries md
     WHERE md.status IN ('PROGRAMADA', 'RENOVACION_PENDIENTE', 'LISTO_PARA_RECOGER')
       AND md.pickup_deadline IS NOT NULL
       AND md.pickup_deadline < $1::date`,
    [referenceDate]
  );
  return result.rows;
}

export async function getNextDeliveryNumber(client, medicationId) {
  const result = await client.query(
    `SELECT COALESCE(MAX(delivery_number), 0) + 1 AS next_number
     FROM medication_deliveries
     WHERE medication_id = $1`,
    [medicationId]
  );
  return Number(result.rows[0].next_number);
}

// Único punto de inserción de entregas: siempre lo llama el service de forma
// automática (al crear la autorización o al cerrar un ciclo). No existe un
// endpoint que permita crear una entrega manualmente desde afuera.
export async function insertGeneratedDelivery(client, medicationId, data) {
  const deliveryNumber = data.deliveryNumber ?? (await getNextDeliveryNumber(client, medicationId));

  const result = await client.query(
    `INSERT INTO medication_deliveries (
      medication_id, authorization_id, delivery_number,
      scheduled_date, pickup_deadline, status,
      pharmacy_name, pharmacy_address, pharmacy_phone, pharmacy_website
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING id`,
    [
      medicationId,
      data.authorizationId,
      deliveryNumber,
      data.scheduledDate ?? null,
      data.pickupDeadline ?? null,
      data.status,
      data.pharmacyName ?? null,
      data.pharmacyAddress ?? null,
      data.pharmacyPhone ?? null,
      data.pharmacyWebsite ?? null
    ]
  );
  return findDeliveryById(client, result.rows[0].id, medicationId);
}

export async function markDeliveryCollected(client, deliveryId, medicationId, pickedUpDate, notes) {
  const result = await client.query(
    `UPDATE medication_deliveries
     SET status = 'RECOGIDO',
         picked_up_date = $3,
         delivery_notes = COALESCE($4, delivery_notes),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND medication_id = $2
     RETURNING id`,
    [deliveryId, medicationId, pickedUpDate, notes ?? null]
  );
  if (!result.rows[0]) return null;
  return findDeliveryById(client, deliveryId, medicationId);
}

export async function markDeliveryLost(client, deliveryId, medicationId, note) {
  const result = await client.query(
    `UPDATE medication_deliveries
     SET status = 'PERDIDA',
         delivery_notes = COALESCE(delivery_notes || E'\n' || $3, $3),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND medication_id = $2
     RETURNING id`,
    [deliveryId, medicationId, note]
  );
  if (!result.rows[0]) return null;
  return findDeliveryById(client, deliveryId, medicationId);
}

export async function markDeliveryPendingPharmacy(client, deliveryId, medicationId) {
  const result = await client.query(
    `UPDATE medication_deliveries
     SET status = 'PENDIENTE_FARMACIA',
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND medication_id = $2
     RETURNING id`,
    [deliveryId, medicationId]
  );
  if (!result.rows[0]) return null;
  return findDeliveryById(client, deliveryId, medicationId);
}

export async function markDeliveryRenewalPending(client, deliveryId, medicationId) {
  const result = await client.query(
    `UPDATE medication_deliveries
     SET status = 'RENOVACION_PENDIENTE',
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND medication_id = $2 AND status = 'PROGRAMADA'
     RETURNING id`,
    [deliveryId, medicationId]
  );
  if (!result.rows[0]) return null;
  return findDeliveryById(client, deliveryId, medicationId);
}

export async function markDeliveryManaged(client, deliveryId, medicationId) {
  const result = await client.query(
    `UPDATE medication_deliveries
     SET status = 'LISTO_PARA_RECOGER',
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND medication_id = $2 AND status = 'RENOVACION_PENDIENTE'
     RETURNING id`,
    [deliveryId, medicationId]
  );
  if (!result.rows[0]) return null;
  return findDeliveryById(client, deliveryId, medicationId);
}

export async function updateMedicationManagementStatus(client, medicationId, status) {
  const result = await client.query(
    `UPDATE medications
     SET management_status = $2, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING id, management_status, updated_at`,
    [medicationId, status]
  );
  return result.rows[0] ?? null;
}

export async function insertProcessHistory(client, {
  medicationId,
  authorizationId = null,
  deliveryId = null,
  eventType,
  userId = null,
  notes = null
}) {
  const result = await client.query(
    `INSERT INTO medication_process_history (
      medication_id, authorization_id, delivery_id, event_type, changed_by_user_id, notes
    ) VALUES ($1,$2,$3,$4,$5,$6)
    RETURNING id, medication_id, authorization_id, delivery_id, event_type, changed_by_user_id, notes, created_at`,
    [medicationId, authorizationId, deliveryId, eventType, userId, notes]
  );
  return result.rows[0];
}

export async function listProcessHistory(client, medicationId, limit) {
  const result = await client.query(
    `SELECT mph.id, mph.medication_id, mph.authorization_id, mph.delivery_id,
            mph.event_type, mph.changed_by_user_id, mph.notes, mph.created_at
     FROM medication_process_history mph
     WHERE mph.medication_id = $1
     ORDER BY mph.created_at DESC
     LIMIT $2`,
    [medicationId, limit]
  );
  return result.rows;
}

// Fan-out de notificaciones a todos los destinatarios configurados para el
// medicamento (reminder_recipients). Usado tanto por el service como por el cron.
export async function listReminderRecipients(client, medicationId) {
  const result = await client.query(
    `SELECT user_id FROM reminder_recipients WHERE medication_id = $1`,
    [medicationId]
  );
  return result.rows.map((row) => row.user_id);
}

export async function existsNotificationForEntity(client, { userId, entityId, notificationType }) {
  const result = await client.query(
    `SELECT 1 FROM notifications
     WHERE user_id = $1
       AND entity_id = $2
       AND notification_type = $3
     LIMIT 1`,
    [userId, entityId, notificationType]
  );
  return result.rows.length > 0;
}

export async function insertNotification(client, { userId, notificationType, title, body, entityType, entityId }) {
  await client.query(
    `INSERT INTO notifications (
      user_id, notification_type, title, body, entity_type, entity_id
    ) VALUES ($1,$2,$3,$4,$5,$6)`,
    [userId, notificationType, title, body ?? null, entityType ?? null, entityId ?? null]
  );
}
