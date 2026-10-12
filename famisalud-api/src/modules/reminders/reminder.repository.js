export async function listRecipients(client, medicationId) {
  const result = await client.query(
    `SELECT rr.id, rr.medication_id, rr.user_id,
            u.first_name, u.last_name, u.email,
            rr.created_at
     FROM reminder_recipients rr
     JOIN users u ON u.id = rr.user_id
     WHERE rr.medication_id = $1
     ORDER BY u.first_name, u.last_name`,
    [medicationId]
  );

  return result.rows;
}

export async function findRecipient(client, medicationId, userId) {
  const result = await client.query(
    `SELECT id, medication_id, user_id, created_at
     FROM reminder_recipients
     WHERE medication_id = $1 AND user_id = $2
     LIMIT 1`,
    [medicationId, userId]
  );

  return result.rows[0] ?? null;
}

export async function createRecipient(client, medicationId, userId) {
  const result = await client.query(
    `INSERT INTO reminder_recipients (medication_id, user_id)
     VALUES ($1, $2)
     RETURNING id, medication_id, user_id, created_at`,
    [medicationId, userId]
  );

  return result.rows[0];
}

export async function deleteRecipient(client, medicationId, userId) {
  const result = await client.query(
    `DELETE FROM reminder_recipients
     WHERE medication_id = $1 AND user_id = $2
     RETURNING id, medication_id, user_id`,
    [medicationId, userId]
  );

  return result.rows[0] ?? null;
}

export async function userIsActiveFamilyMember(client, familyId, userId) {
  const result = await client.query(
    `SELECT 1
     FROM family_users
     WHERE family_id = $1
       AND user_id = $2
       AND left_at IS NULL
     LIMIT 1`,
    [familyId, userId]
  );

  return Boolean(result.rows[0]);
}
