export async function list(client, memberId) {
  const result = await client.query(
    `SELECT id, member_id, vaccine_name, dose, application_date, next_dose, provider, created_at, updated_at
     FROM vaccines
     WHERE member_id = $1 AND deleted_at IS NULL
     ORDER BY application_date DESC NULLS LAST, created_at DESC`, [memberId]);
  return result.rows;
}

export async function findById(client, id, memberId) {
  const result = await client.query(
    `SELECT id, member_id, vaccine_name, dose, application_date, next_dose, provider, created_at, updated_at
     FROM vaccines
     WHERE id = $1 AND member_id = $2 AND deleted_at IS NULL LIMIT 1`, [id, memberId]);
  return result.rows[0] ?? null;
}

export async function create(client, memberId, data) {
  const result = await client.query(
    `INSERT INTO vaccines (member_id, vaccine_name, dose, application_date, next_dose, provider)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, member_id, vaccine_name, dose, application_date, next_dose, provider, created_at, updated_at`,
    [memberId, data.vaccineName, data.dose ?? null, data.applicationDate ?? null, data.nextDose ?? null, data.provider ?? null]
  );
  return result.rows[0];
}

export async function update(client, id, memberId, data) {
  const fields = { vaccineName: 'vaccine_name', dose: 'dose', applicationDate: 'application_date', nextDose: 'next_dose', provider: 'provider' };
  const entries = Object.entries(data).filter(([key, value]) => key in fields && value !== undefined);
  const assignments = entries.map(([key], index) => `${fields[key]} = $${index + 3}`);
  const values = entries.map(([, value]) => value ?? null);
  const result = await client.query(
    `UPDATE vaccines
     SET ${assignments.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND member_id = $2 AND deleted_at IS NULL
     RETURNING id, member_id, vaccine_name, dose, application_date, next_dose, provider, created_at, updated_at`,
    [id, memberId, ...values]);
  return result.rows[0] ?? null;
}

export async function softDelete(client, id, memberId) {
  const result = await client.query(
    `UPDATE vaccines
     SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND member_id = $2 AND deleted_at IS NULL
     RETURNING id, member_id, deleted_at`, [id, memberId]);
  return result.rows[0] ?? null;
}
