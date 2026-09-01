import { AppError } from '../utils/AppError.js';

export async function findActiveMembership(client, familyId, userId) {
  const result = await client.query(
    `SELECT id, family_id, user_id, role
     FROM family_users
     WHERE family_id = $1
       AND user_id = $2
       AND left_at IS NULL
     LIMIT 1`,
    [familyId, userId]
  );

  return result.rows[0] ?? null;
}

export async function getMemberAccess(client, memberId, userId) {
  const memberResult = await client.query(
    `SELECT id, family_id, linked_user_id, relationship, custom_relationship,
            first_name, last_name, birth_date, gender, custom_gender,
            blood_type, phone, sisben, stratum, avatar_url,
            created_at, updated_at
     FROM family_members
     WHERE id = $1
       AND deleted_at IS NULL
     LIMIT 1`,
    [memberId]
  );

  const member = memberResult.rows[0] ?? null;

  if (!member) {
    throw new AppError('Miembro no encontrado.', 404);
  }

  const membership = await findActiveMembership(client, member.family_id, userId);

  if (!membership) {
    throw new AppError('No tienes acceso a esta familia.', 403);
  }

  return {
    member,
    membership,
    isAdmin: membership.role === 'ADMINISTRADOR',
    isOwnMember: member.linked_user_id === userId
  };
}

export async function assertCanViewMember(client, memberId, userId) {
  return getMemberAccess(client, memberId, userId);
}

export async function assertCanManageMember(client, memberId, userId) {
  const access = await getMemberAccess(client, memberId, userId);

  if (!access.isAdmin && !access.isOwnMember) {
    throw new AppError('Solo puedes gestionar tu propia información.', 403);
  }

  return access;
}

export async function assertCanManageFamily(client, familyId, userId) {
  const membership = await findActiveMembership(client, familyId, userId);

  if (!membership) {
    throw new AppError('No tienes acceso a esta familia.', 403);
  }

  if (membership.role !== 'ADMINISTRADOR') {
    throw new AppError('Solo un administrador puede gestionar esta familia.', 403);
  }

  return membership;
}

export async function assertResourceBelongsToMember(client, {
  memberId,
  resourceId,
  tableName
}) {
  const allowedTables = new Set([
    'allergies',
    'medical_conditions',
    'vaccines',
    'emergency_contacts',
    'vital_signs',
    'insurance_plans'
  ]);

  if (!allowedTables.has(tableName)) {
    throw new AppError('Recurso no permitido para autorización.', 500);
  }

  const result = await client.query(
    `SELECT id
     FROM ${tableName}
     WHERE id = $1
       AND member_id = $2
       AND deleted_at IS NULL
     LIMIT 1`,
    [resourceId, memberId]
  );

  if (!result.rows[0]) {
    throw new AppError('Registro no encontrado.', 404);
  }

  return result.rows[0];
}

export async function assertMemberResourceViewAccess(client, {
  memberId,
  resourceId,
  userId,
  tableName
}) {
  const access = await assertCanViewMember(client, memberId, userId);

  await assertResourceBelongsToMember(client, {
    memberId: access.member.id,
    resourceId,
    tableName
  });

  return access;
}

export async function assertMemberResourceManageAccess(client, {
  memberId,
  resourceId,
  userId,
  tableName
}) {
  const access = await assertCanManageMember(client, memberId, userId);

  await assertResourceBelongsToMember(client, {
    memberId: access.member.id,
    resourceId,
    tableName
  });

  return access;
}
