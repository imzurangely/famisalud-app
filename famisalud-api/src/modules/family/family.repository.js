export async function findMembership(client, familyId, userId) {
  const result = await client.query(
    `SELECT id, family_id, user_id, role
     FROM family_users
     WHERE family_id = $1 AND user_id = $2 AND left_at IS NULL
     LIMIT 1`,
    [familyId, userId]
  );

  return result.rows[0] ?? null;
}

export async function findMemberById(client, memberId) {
  const result = await client.query(
    `SELECT id, family_id, linked_user_id, relationship, custom_relationship,
            first_name, last_name, birth_date, gender, custom_gender,
            blood_type, phone, sisben, stratum, avatar_url,
            created_at, updated_at
     FROM family_members
     WHERE id = $1 AND deleted_at IS NULL`,
    [memberId]
  );

  return result.rows[0] ?? null;
}

export async function listMembersByFamily(client, familyId) {
  const result = await client.query(
    `SELECT id, family_id, linked_user_id, relationship, custom_relationship,
            first_name, last_name, birth_date, gender, custom_gender,
            blood_type, phone, sisben, stratum, avatar_url,
            created_at, updated_at
     FROM family_members
     WHERE family_id = $1 AND deleted_at IS NULL
     ORDER BY first_name ASC, last_name ASC`,
    [familyId]
  );

  return result.rows;
}

export async function createMember(client, familyId, data) {
  const result = await client.query(
    `INSERT INTO family_members (
      family_id, relationship, custom_relationship, first_name, last_name,
      birth_date, gender, custom_gender, blood_type, phone, sisben, stratum, avatar_url
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    RETURNING *`,
    [
      familyId,
      data.relationship,
      data.customRelationship ?? null,
      data.firstName,
      data.lastName,
      data.birthDate ?? null,
      data.gender ?? null,
      data.customGender ?? null,
      data.bloodType ?? null,
      data.phone ?? null,
      data.sisben ?? null,
      data.stratum ?? null,
      data.avatarUrl ?? null
    ]
  );

  return result.rows[0];
}

export async function updateMember(client, memberId, data) {
  const fields = {
    relationship: 'relationship',
    customRelationship: 'custom_relationship',
    firstName: 'first_name',
    lastName: 'last_name',
    birthDate: 'birth_date',
    gender: 'gender',
    customGender: 'custom_gender',
    bloodType: 'blood_type',
    phone: 'phone',
    sisben: 'sisben',
    stratum: 'stratum',
    avatarUrl: 'avatar_url'
  };

  const entries = Object.entries(data).filter(([key, value]) => key in fields && value !== undefined);

  if (!entries.length) {
    return findMemberById(client, memberId);
  }

  const assignments = entries.map(([key], index) => `${fields[key]} = $${index + 2}`);
  const values = entries.map(([, value]) => value ?? null);

  const result = await client.query(
    `UPDATE family_members
     SET ${assignments.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING *`,
    [memberId, ...values]
  );

  return result.rows[0] ?? null;
}

export async function softDeleteMember(client, memberId) {
  const result = await client.query(
    `UPDATE family_members
     SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING id, family_id`,
    [memberId]
  );

  return result.rows[0] ?? null;
}
