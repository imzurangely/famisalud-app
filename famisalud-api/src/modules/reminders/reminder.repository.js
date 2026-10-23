export async function listRecipients(client, medicationId) {
  const result = await client.query(
    `SELECT rr.id, rr.medication_id, rr.user_id,
            p.first_name, p.last_name, u.email,
            rr.created_at
     FROM reminder_recipients rr
     JOIN medications m ON m.id = rr.medication_id AND m.deleted_at IS NULL
     JOIN family_members medication_profile ON medication_profile.id = m.member_id
       AND medication_profile.deleted_at IS NULL
     JOIN family_members shared_profile ON shared_profile.person_id = medication_profile.person_id
       AND shared_profile.deleted_at IS NULL
     JOIN family_users fu ON fu.family_id = shared_profile.family_id
       AND fu.user_id = rr.user_id
       AND fu.left_at IS NULL
     JOIN users u ON u.id = rr.user_id
       AND u.is_active = TRUE
       AND u.deleted_at IS NULL
     JOIN persons p ON p.id = u.person_id
     WHERE rr.medication_id = $1
     ORDER BY p.first_name, p.last_name`,
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
     FROM family_users fu
     JOIN users u ON u.id = fu.user_id
       AND u.is_active = TRUE
       AND u.deleted_at IS NULL
     WHERE fu.family_id = $1
       AND fu.user_id = $2
       AND fu.left_at IS NULL
     LIMIT 1`,
    [familyId, userId]
  );

  return Boolean(result.rows[0]);
}
