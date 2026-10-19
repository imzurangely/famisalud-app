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
    `SELECT fm.id, fm.family_id, fm.person_id, fm.relationship,
            fm.custom_relationship, p.first_name, p.last_name, p.birth_date,
            p.gender, p.custom_gender, p.blood_type, p.phone, p.sisben,
            p.stratum, p.avatar_url, fm.created_at, fm.updated_at,
            linked_user.id AS linked_user_id,
            EXISTS (
              SELECT 1
              FROM users requesting_user
              WHERE requesting_user.id = $2
                AND requesting_user.person_id = fm.person_id
                AND requesting_user.deleted_at IS NULL
                AND requesting_user.is_active = TRUE
            ) AS is_own_member
     FROM family_members fm
     JOIN persons p ON p.id = fm.person_id
     LEFT JOIN users linked_user
       ON linked_user.person_id = p.id
      AND linked_user.deleted_at IS NULL
     WHERE fm.id = $1
       AND fm.deleted_at IS NULL
     LIMIT 1`,
    [memberId, userId]
  );

  const member = memberResult.rows[0] ?? null;
  if (!member) throw new AppError('Miembro no encontrado.', 404);

  const membership = await findActiveMembership(client, member.family_id, userId);
  if (!membership) throw new AppError('No tienes acceso a esta familia.', 403);

  return {
    member,
    membership,
    isAdmin: membership.role === 'ADMINISTRADOR',
    isOwnMember: member.is_own_member
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
  if (!membership) throw new AppError('No tienes acceso a esta familia.', 403);
  if (membership.role !== 'ADMINISTRADOR') {
    throw new AppError('Solo un administrador puede gestionar esta familia.', 403);
  }
  return membership;
}

export async function assertResourceBelongsToMember(client, { memberId, resourceId, tableName }) {
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
    `SELECT clinical_resource.id
     FROM ${tableName} clinical_resource
     JOIN family_members resource_profile ON resource_profile.id = clinical_resource.member_id
     JOIN family_members requested_profile ON requested_profile.id = $2
     WHERE clinical_resource.id = $1
       AND resource_profile.person_id = requested_profile.person_id
       AND clinical_resource.deleted_at IS NULL
     LIMIT 1`,
    [resourceId, memberId]
  );
  if (!result.rows[0]) throw new AppError('Registro no encontrado.', 404);
  return result.rows[0];
}

export async function assertMemberResourceViewAccess(client, { memberId, resourceId, userId, tableName }) {
  const access = await assertCanViewMember(client, memberId, userId);
  await assertResourceBelongsToMember(client, {
    memberId: access.member.id,
    resourceId,
    tableName
  });
  return access;
}

export async function assertMemberResourceManageAccess(client, { memberId, resourceId, userId, tableName }) {
  const access = await assertCanManageMember(client, memberId, userId);
  await assertResourceBelongsToMember(client, {
    memberId: access.member.id,
    resourceId,
    tableName
  });
  return access;
}
