const MEMBER_COLUMNS = `
  fm.id, fm.family_id, fm.person_id, fm.relationship, fm.custom_relationship,
  p.first_name, p.last_name, p.birth_date, p.gender, p.custom_gender,
  p.blood_type, p.phone, p.sisben, p.stratum, p.avatar_url,
  linked_user.id AS linked_user_id,
  fm.created_at, fm.updated_at, fm.deleted_at`;

const MEMBER_JOINS = `
  FROM family_members fm
  JOIN persons p ON p.id = fm.person_id
  LEFT JOIN users linked_user
    ON linked_user.person_id = p.id
   AND linked_user.deleted_at IS NULL`;

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
    `SELECT ${MEMBER_COLUMNS}
     ${MEMBER_JOINS}
     WHERE fm.id = $1 AND fm.deleted_at IS NULL
     LIMIT 1`,
    [memberId]
  );
  return result.rows[0] ?? null;
}

export async function listMembersByFamily(client, familyId) {
  const result = await client.query(
    `SELECT ${MEMBER_COLUMNS}
     ${MEMBER_JOINS}
     WHERE fm.family_id = $1 AND fm.deleted_at IS NULL
     ORDER BY p.first_name ASC, p.last_name ASC`,
    [familyId]
  );
  return result.rows;
}

export async function createMember(client, familyId, data) {
  const personResult = await client.query(
    `INSERT INTO persons (
       first_name, last_name, birth_date, gender, custom_gender,
       blood_type, phone, sisben, stratum, avatar_url
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id`,
    [
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

  const personId = personResult.rows[0].id;
  const memberResult = await client.query(
    `INSERT INTO family_members (family_id, person_id, relationship, custom_relationship)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [familyId, personId, data.relationship, data.customRelationship ?? null]
  );

  return findMemberById(client, memberResult.rows[0].id);
}

export async function updateMember(client, memberId, data) {
  const personFields = {
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
  const familyFields = {
    relationship: 'relationship',
    customRelationship: 'custom_relationship'
  };

  const personEntries = Object.entries(data).filter(
    ([key, value]) => key in personFields && value !== undefined
  );
  const familyEntries = Object.entries(data).filter(
    ([key, value]) => key in familyFields && value !== undefined
  );

  if (personEntries.length) {
    const current = await findMemberById(client, memberId);
    if (!current) return null;

    const assignments = personEntries.map(([key], index) => `${personFields[key]} = $${index + 2}`);
    const values = personEntries.map(([, value]) => value ?? null);
    await client.query(
      `UPDATE persons
       SET ${assignments.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [current.person_id, ...values]
    );
  }

  if (familyEntries.length) {
    const assignments = familyEntries.map(([key], index) => `${familyFields[key]} = $${index + 2}`);
    const values = familyEntries.map(([, value]) => value ?? null);
    await client.query(
      `UPDATE family_members
       SET ${assignments.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND deleted_at IS NULL`,
      [memberId, ...values]
    );
  }

  return findMemberById(client, memberId);
}

export async function softDeleteMember(client, memberId) {
  const result = await client.query(
    `UPDATE family_members
     SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING id, family_id, deleted_at`,
    [memberId]
  );
  return result.rows[0] ?? null;
}

export async function leaveFamilyMembershipForUser(client, familyId, userId) {
  const result = await client.query(
    `UPDATE family_users
     SET left_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE family_id = $1
       AND user_id = $2
       AND left_at IS NULL
     RETURNING id, family_id, user_id, role, left_at`,
    [familyId, userId]
  );
  return result.rows[0] ?? null;
}

export async function createFamily(client, { name, isPersonal = false }) {
  const result = await client.query(
    `INSERT INTO families (name, is_personal)
     VALUES ($1, $2)
     RETURNING id, name, is_personal, created_at, updated_at`,
    [name, isPersonal]
  );
  return result.rows[0];
}

export async function listFamiliesByUser(client, userId) {
  const result = await client.query(
    `SELECT f.id, f.name, f.is_personal, f.created_at, f.updated_at,
            fu.id AS membership_id, fu.role, fu.joined_at
     FROM family_users fu
     JOIN families f ON f.id = fu.family_id
     WHERE fu.user_id = $1 AND fu.left_at IS NULL
     ORDER BY fu.joined_at ASC`,
    [userId]
  );
  return result.rows;
}

export async function findActiveUser(client, userId) {
  const result = await client.query(
    `SELECT u.id, u.person_id, p.first_name, p.last_name, u.email,
            u.is_active, u.deleted_at
     FROM users u
     JOIN persons p ON p.id = u.person_id
     WHERE u.id = $1 AND u.is_active = TRUE AND u.deleted_at IS NULL
     LIMIT 1
     FOR UPDATE OF u`,
    [userId]
  );
  return result.rows[0] ?? null;
}

export async function addFamilyMembership(client, familyId, userId, role = 'MIEMBRO') {
  const result = await client.query(
    `INSERT INTO family_users (family_id, user_id, role)
     VALUES ($1, $2, $3)
     RETURNING id, family_id, user_id, role, joined_at, left_at`,
    [familyId, userId, role]
  );
  return result.rows[0];
}

export async function createSelfMember(client, familyId, user) {
  const result = await client.query(
    `INSERT INTO family_members (family_id, person_id, relationship)
     VALUES ($1, $2, 'YO_MISMO')
     RETURNING id`,
    [familyId, user.person_id]
  );
  return findMemberById(client, result.rows[0].id);
}

export async function findActiveUserByEmail(client, email) {
  const result = await client.query(
    `SELECT u.id, u.person_id, p.first_name, p.last_name, u.email,
            u.is_active, u.deleted_at
     FROM users u
     JOIN persons p ON p.id = u.person_id
     WHERE u.email = $1 AND u.is_active = TRUE AND u.deleted_at IS NULL
     LIMIT 1`,
    [email]
  );
  return result.rows[0] ?? null;
}

export async function findFamilyMemberForUpdate(client, familyId, memberId) {
  const result = await client.query(
    `SELECT ${MEMBER_COLUMNS}
     ${MEMBER_JOINS}
     WHERE fm.id = $1 AND fm.family_id = $2 AND fm.deleted_at IS NULL
     LIMIT 1
     FOR UPDATE OF fm`,
    [memberId, familyId]
  );
  return result.rows[0] ?? null;
}

export async function findLinkedMemberByUser(client, familyId, userId) {
  const result = await client.query(
    `SELECT ${MEMBER_COLUMNS}
     ${MEMBER_JOINS}
     JOIN users requesting_user ON requesting_user.person_id = fm.person_id
       AND requesting_user.id = $2 AND requesting_user.deleted_at IS NULL
     WHERE fm.family_id = $1 AND fm.deleted_at IS NULL
     LIMIT 1
     FOR UPDATE OF fm`,
    [familyId, userId]
  );
  return result.rows[0] ?? null;
}

/* Vincula un perfil manual a la identidad de la cuenta tras una acción autorizada. 
Si ambas identidades eran distintas, las consolida en la identidad de la cuenta. */
export async function linkMemberToUser(client, memberId, userId) {
  const result = await client.query(
    `SELECT fm.id, fm.family_id, fm.person_id AS source_person_id,
            u.person_id AS target_person_id
     FROM family_members fm
     JOIN users u ON u.id = $2 AND u.deleted_at IS NULL AND u.is_active = TRUE
     WHERE fm.id = $1 AND fm.deleted_at IS NULL
     LIMIT 1
     FOR UPDATE OF fm, u`,
    [memberId, userId]
  );
  const link = result.rows[0];
  if (!link) return null;

  if (link.source_person_id === link.target_person_id) {
    return findMemberById(client, memberId);
  }

  const sourceOwner = await client.query(
    `SELECT id
     FROM users
     WHERE person_id = $1 AND deleted_at IS NULL AND id <> $2
     LIMIT 1
     FOR UPDATE`,
    [link.source_person_id, userId]
  );
  if (sourceOwner.rows[0]) return { conflict: 'PERSON_LINKED_TO_OTHER_ACCOUNT' };

  const duplicate = await client.query(
    `SELECT 1
     FROM family_members source_member
     JOIN family_members target_member
       ON target_member.family_id = source_member.family_id
      AND target_member.person_id = $2
      AND target_member.deleted_at IS NULL
     WHERE source_member.person_id = $1
       AND source_member.deleted_at IS NULL
     LIMIT 1`,
    [link.source_person_id, link.target_person_id]
  );
  if (duplicate.rows[0]) return { conflict: 'DUPLICATE_ACTIVE_PROFILE' };

  await client.query(
    `UPDATE persons target_person
     SET birth_date = COALESCE(target_person.birth_date, source_person.birth_date),
         gender = COALESCE(target_person.gender, source_person.gender),
         custom_gender = CASE
           WHEN target_person.gender IS NULL THEN source_person.custom_gender
           ELSE target_person.custom_gender
         END,
         blood_type = COALESCE(target_person.blood_type, source_person.blood_type),
         phone = COALESCE(target_person.phone, source_person.phone),
         sisben = COALESCE(target_person.sisben, source_person.sisben),
         stratum = COALESCE(target_person.stratum, source_person.stratum),
         avatar_url = COALESCE(target_person.avatar_url, source_person.avatar_url),
         updated_at = CURRENT_TIMESTAMP
     FROM persons source_person
     WHERE target_person.id = $1 AND source_person.id = $2`,
    [link.target_person_id, link.source_person_id]
  );

  await client.query(
    `UPDATE family_members
     SET person_id = $2, updated_at = CURRENT_TIMESTAMP
     WHERE person_id = $1`,
    [link.source_person_id, link.target_person_id]
  );

  await client.query(
    `DELETE FROM persons old_person
     WHERE old_person.id = $1
       AND NOT EXISTS (SELECT 1 FROM users u WHERE u.person_id = old_person.id)
       AND NOT EXISTS (SELECT 1 FROM family_members fm WHERE fm.person_id = old_person.id)`,
    [link.source_person_id]
  );

  return findMemberById(client, memberId);
}

export async function findActiveMembershipsForUpdate(client, familyId) {
  const result = await client.query(
    `SELECT id, family_id, user_id, role, joined_at, left_at
     FROM family_users
     WHERE family_id = $1 AND left_at IS NULL
     ORDER BY id
     FOR UPDATE`,
    [familyId]
  );
  return result.rows;
}

export async function updateMembershipRole(client, membershipId, role) {
  const result = await client.query(
    `UPDATE family_users
     SET role = $2, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND left_at IS NULL
     RETURNING id, family_id, user_id, role`,
    [membershipId, role]
  );
  return result.rows[0] ?? null;
}

export async function leaveFamily(client, membershipId) {
  const result = await client.query(
    `UPDATE family_users
     SET left_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND left_at IS NULL
     RETURNING id, family_id, user_id, role, left_at`,
    [membershipId]
  );
  return result.rows[0] ?? null;
}

export async function listAuditLogs(client, familyId, limit = 50) {
  const result = await client.query(
    `SELECT al.id, al.user_id, al.family_id, al.action, al.entity,
            al.entity_id, al.changes, al.created_at,
            p.first_name AS actor_first_name,
            p.last_name AS actor_last_name,
            u.email AS actor_email
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.user_id
     LEFT JOIN persons p ON p.id = u.person_id
     WHERE al.family_id = $1
     ORDER BY al.created_at DESC
     LIMIT $2`,
    [familyId, limit]
  );
  return result.rows;
}
