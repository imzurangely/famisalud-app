export async function findAppointmentById(client, appointmentId, memberId = null) {
  const result = await client.query(
    `SELECT id, member_id, created_by_user_id, title, appointment_type,
            custom_type, doctor_name, location, starts_at, ends_at, notes,
            status, created_at, updated_at, deleted_at
     FROM appointments
     WHERE id = $1
       AND deleted_at IS NULL
       AND ($2::uuid IS NULL OR member_id = $2)
     LIMIT 1`,
    [appointmentId, memberId]
  );

  return result.rows[0] ?? null;
}

export async function listAppointments(client, memberId, { from, to, status } = {}) {
  const values = [memberId];
  const conditions = ['member_id = $1', 'deleted_at IS NULL'];

  if (from) {
    values.push(from);
    conditions.push(`starts_at >= $${values.length}`);
  }

  if (to) {
    values.push(to);
    conditions.push(`starts_at < $${values.length}`);
  }

  if (status) {
    values.push(status);
    conditions.push(`status = $${values.length}`);
  }

  const result = await client.query(
    `SELECT id, member_id, created_by_user_id, title, appointment_type,
            custom_type, doctor_name, location, starts_at, ends_at, notes,
            status, created_at, updated_at
     FROM appointments
     WHERE ${conditions.join(' AND ')}
     ORDER BY starts_at ASC
     LIMIT 100`,
    values
  );

  return result.rows;
}

export async function findConflictingAppointment(client, memberId, startsAt, appointmentId = null) {
  const result = await client.query(
    `SELECT id, title, starts_at, ends_at, status
     FROM appointments
     WHERE member_id = $1
       AND deleted_at IS NULL
       AND status <> 'CANCELADA'
       AND ($3::uuid IS NULL OR id <> $3)
       AND ABS(EXTRACT(EPOCH FROM (starts_at - $2::timestamptz))) < 7200
     ORDER BY ABS(EXTRACT(EPOCH FROM (starts_at - $2::timestamptz))) ASC
     LIMIT 1`,
    [memberId, startsAt, appointmentId]
  );

  return result.rows[0] ?? null;
}

export async function createAppointment(client, memberId, userId, data) {
  const result = await client.query(
    `INSERT INTO appointments (
      member_id, created_by_user_id, title, appointment_type, custom_type,
      doctor_name, location, starts_at, ends_at, notes, status
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    RETURNING id, member_id, created_by_user_id, title, appointment_type,
              custom_type, doctor_name, location, starts_at, ends_at, notes,
              status, created_at, updated_at`,
    [
      memberId,
      userId,
      data.title,
      data.appointmentType ?? 'CONSULTA_MEDICA',
      data.customType ?? null,
      data.doctorName ?? null,
      data.location ?? null,
      data.startsAt,
      data.endsAt ?? null,
      data.notes ?? null,
      data.status ?? 'PROGRAMADA'
    ]
  );

  return result.rows[0];
}

export async function updateAppointment(client, appointmentId, data) {
  const fields = {
    title: 'title',
    appointmentType: 'appointment_type',
    customType: 'custom_type',
    doctorName: 'doctor_name',
    location: 'location',
    startsAt: 'starts_at',
    endsAt: 'ends_at',
    notes: 'notes',
    status: 'status'
  };

  const entries = Object.entries(data).filter(([key]) => key in fields);

  if (!entries.length) {
    return findAppointmentById(client, appointmentId);
  }

  const assignments = entries.map(([key], index) => `${fields[key]} = $${index + 2}`);
  const values = entries.map(([, value]) => value ?? null);

  const result = await client.query(
    `UPDATE appointments
     SET ${assignments.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING id, member_id, created_by_user_id, title, appointment_type,
               custom_type, doctor_name, location, starts_at, ends_at, notes,
               status, created_at, updated_at`,
    [appointmentId, ...values]
  );

  return result.rows[0] ?? null;
}

export async function softDeleteAppointment(client, appointmentId) {
  const result = await client.query(
    `UPDATE appointments
     SET deleted_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING id, member_id, deleted_at`,
    [appointmentId]
  );

  return result.rows[0] ?? null;
}
