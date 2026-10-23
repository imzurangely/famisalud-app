import {
  findMemberById,
  leaveFamilyMembershipForUser as closeFamilyMembership,
  linkMemberToUser as mergeMemberIdentity
} from '../family/family.repository.js';

export async function findUserById(client, userId) {
  const result = await client.query(
    `SELECT u.id, u.person_id, p.first_name, p.last_name, u.email,
            u.is_active, u.deleted_at
     FROM users u
     JOIN persons p ON p.id = u.person_id
     WHERE u.id = $1 AND u.is_active = TRUE AND u.deleted_at IS NULL
     LIMIT 1`,
    [userId]
  );
  return result.rows[0] ?? null;
}

export async function findFamily(client, familyId) {
  const result = await client.query(
    `SELECT id, name FROM families WHERE id = $1 LIMIT 1`,
    [familyId]
  );
  return result.rows[0] ?? null;
}

export async function findUserByEmail(client, email) {
  const result = await client.query(
    `SELECT u.id, u.person_id, p.first_name, p.last_name, u.email, u.is_active
     FROM users u
     JOIN persons p ON p.id = u.person_id
     WHERE u.email = $1 AND u.is_active = TRUE AND u.deleted_at IS NULL
     LIMIT 1`,
    [email]
  );
  return result.rows[0] ?? null;
}

export async function findActiveMembership(client, familyId, userId) {
  const result = await client.query(
    `SELECT id, family_id, user_id, role
     FROM family_users
     WHERE family_id = $1 AND user_id = $2 AND left_at IS NULL
     LIMIT 1
     FOR UPDATE`,
    [familyId, userId]
  );
  return result.rows[0] ?? null;
}


export async function leaveFamilyMembershipForUser(client, familyId, userId) {
  return closeFamilyMembership(client, familyId, userId);
}

export async function findMemberForInvitation(client, familyId, memberId) {
  const result = await client.query(
    `SELECT fm.id, fm.family_id, fm.person_id, fm.relationship, fm.custom_relationship,
            p.first_name, p.last_name, linked_user.id AS linked_user_id,
            linked_user.email AS linked_user_email
     FROM family_members fm
     JOIN persons p ON p.id = fm.person_id
     LEFT JOIN users linked_user
       ON linked_user.person_id = p.id
      AND linked_user.deleted_at IS NULL
     WHERE fm.id = $1 AND fm.family_id = $2 AND fm.deleted_at IS NULL
     LIMIT 1
     FOR UPDATE OF fm`,
    [memberId, familyId]
  );
  return result.rows[0] ?? null;
}

export async function findPendingInvitationByEmail(client, familyId, email) {
  const result = await client.query(
    `SELECT id, expires_at
     FROM family_invitations
     WHERE family_id = $1 AND email = $2 AND status = 'PENDIENTE'
     ORDER BY created_at DESC
     LIMIT 1
     FOR UPDATE`,
    [familyId, email]
  );
  return result.rows[0] ?? null;
}

export async function createInvitation(client, data) {
  const result = await client.query(
    `INSERT INTO family_invitations (
       family_id, invited_by_user_id, email, relationship,
       custom_relationship, member_id, token, expires_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP + INTERVAL '7 days')
     RETURNING id, family_id, invited_by_user_id, email, relationship,
               custom_relationship, member_id, status, expires_at, created_at`,
    [
      data.familyId,
      data.invitedByUserId,
      data.email,
      data.relationship,
      data.customRelationship ?? null,
      data.memberId ?? null,
      data.tokenHash
    ]
  );
  return result.rows[0];
}

export async function updateInvitationToken(client, invitationId, tokenHash) {
  const result = await client.query(
    `UPDATE family_invitations
     SET token = $2, expires_at = CURRENT_TIMESTAMP + INTERVAL '7 days', updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND status = 'PENDIENTE' AND expires_at > CURRENT_TIMESTAMP
     RETURNING id, family_id, invited_by_user_id, email, status, expires_at`,
    [invitationId, tokenHash]
  );
  return result.rows[0] ?? null;
}

export async function findInvitationByTokenForUpdate(client, tokenHash) {
  const result = await client.query(
    `SELECT fi.id, fi.family_id, fi.invited_by_user_id, fi.email,
            fi.relationship, fi.custom_relationship, fi.member_id,
            fi.token, fi.status, fi.expires_at, fi.created_at,
            f.name AS family_name,
            inviter_person.first_name AS inviter_first_name,
            inviter_person.last_name AS inviter_last_name
     FROM family_invitations fi
     JOIN families f ON f.id = fi.family_id
     LEFT JOIN users inviter ON inviter.id = fi.invited_by_user_id
     LEFT JOIN persons inviter_person ON inviter_person.id = inviter.person_id
     WHERE fi.token = $1
     LIMIT 1
     FOR UPDATE OF fi`,
    [tokenHash]
  );
  return result.rows[0] ?? null;
}

export async function findInvitationByIdForUpdate(client, familyId, invitationId) {
  const result = await client.query(
    `SELECT id, family_id, invited_by_user_id, email, relationship,
            custom_relationship, member_id, status, expires_at, created_at
     FROM family_invitations
     WHERE id = $1 AND family_id = $2
     LIMIT 1
     FOR UPDATE`,
    [invitationId, familyId]
  );
  return result.rows[0] ?? null;
}

export async function markInvitationStatus(client, invitationId, status) {
  const result = await client.query(
    `UPDATE family_invitations
     SET status = $2, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND status = 'PENDIENTE'
     RETURNING id, family_id, invited_by_user_id, email, status, expires_at`,
    [invitationId, status]
  );
  return result.rows[0] ?? null;
}

export async function expirePendingInvitations(client, { familyId, email } = {}) {
  const conditions = ["status = 'PENDIENTE'", 'expires_at <= CURRENT_TIMESTAMP'];
  const values = [];
  if (familyId) {
    values.push(familyId);
    conditions.push(`family_id = $${values.length}`);
  }
  if (email) {
    values.push(email);
    conditions.push(`email = $${values.length}`);
  }
  const result = await client.query(
    `UPDATE family_invitations
     SET status = 'EXPIRADA', updated_at = CURRENT_TIMESTAMP
     WHERE ${conditions.join(' AND ')}
     RETURNING id, family_id, invited_by_user_id, email, status, expires_at`,
    values
  );
  return result.rows;
}

export async function listFamilyInvitations(client, familyId, { status, limit = 50 }) {
  const conditions = ['fi.family_id = $1'];
  const values = [familyId];
  let index = 2;
  if (status) {
    conditions.push(`fi.status = $${index++}`);
    values.push(status);
  }
  values.push(limit);
  const result = await client.query(
    `SELECT fi.id, fi.family_id, fi.invited_by_user_id, fi.email,
            fi.relationship, fi.custom_relationship, fi.member_id,
            fi.status, fi.expires_at, fi.created_at,
            invited_person.first_name AS linked_member_first_name,
            invited_person.last_name AS linked_member_last_name,
            inviter_person.first_name AS inviter_first_name,
            inviter_person.last_name AS inviter_last_name
     FROM family_invitations fi
     LEFT JOIN family_members fm ON fm.id = fi.member_id
     LEFT JOIN persons invited_person ON invited_person.id = fm.person_id
     LEFT JOIN users inviter ON inviter.id = fi.invited_by_user_id
     LEFT JOIN persons inviter_person ON inviter_person.id = inviter.person_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY fi.created_at DESC
     LIMIT $${index}`,
    values
  );
  return result.rows;
}

export async function listInvitationsForEmail(client, email, limit = 50) {
  const result = await client.query(
    `SELECT fi.id, fi.family_id, f.name AS family_name,
            fi.email, fi.relationship, fi.custom_relationship, fi.member_id,
            fi.status, fi.expires_at, fi.created_at,
            inviter_person.first_name AS inviter_first_name,
            inviter_person.last_name AS inviter_last_name
     FROM family_invitations fi
     JOIN families f ON f.id = fi.family_id
     LEFT JOIN users inviter ON inviter.id = fi.invited_by_user_id
     LEFT JOIN persons inviter_person ON inviter_person.id = inviter.person_id
     WHERE fi.email = $1
     ORDER BY fi.created_at DESC
     LIMIT $2`,
    [email, limit]
  );
  return result.rows;
}

export async function createFamilyMembership(client, familyId, userId) {
  const result = await client.query(
    `INSERT INTO family_users (family_id, user_id, role)
     VALUES ($1, $2, 'MIEMBRO')
     ON CONFLICT (family_id, user_id)
     DO UPDATE SET role = 'MIEMBRO', joined_at = CURRENT_TIMESTAMP,
                   left_at = NULL, updated_at = CURRENT_TIMESTAMP
     WHERE family_users.left_at IS NOT NULL
     RETURNING id, family_id, user_id, role, joined_at, left_at`,
    [familyId, userId]
  );
  return result.rows[0] ?? null;
}

export async function findLinkedMember(client, familyId, userId) {
  const result = await client.query(
    `SELECT fm.id, fm.family_id, fm.person_id, fm.relationship, fm.custom_relationship,
            p.first_name, p.last_name, linked_user.id AS linked_user_id
     FROM family_members fm
     JOIN persons p ON p.id = fm.person_id
     JOIN users requesting_user ON requesting_user.person_id = fm.person_id
       AND requesting_user.id = $2 AND requesting_user.deleted_at IS NULL
     LEFT JOIN users linked_user ON linked_user.person_id = fm.person_id
       AND linked_user.deleted_at IS NULL
     WHERE fm.family_id = $1 AND fm.deleted_at IS NULL
     LIMIT 1
     FOR UPDATE OF fm`,
    [familyId, userId]
  );
  return result.rows[0] ?? null;
}

export async function createLinkedMember(client, invitation, user) {
  const result = await client.query(
    `INSERT INTO family_members (family_id, person_id, relationship, custom_relationship)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [invitation.family_id, user.person_id, invitation.relationship, invitation.custom_relationship ?? null]
  );
  return findMemberById(client, result.rows[0].id);
}

export async function linkMemberToUser(client, memberId, userId) {
  return mergeMemberIdentity(client, memberId, userId);
}

export async function createNotification(client, { userId, title, body, entityId, metadata = {} }) {
  await client.query(
    `INSERT INTO notifications (user_id, notification_type, title, body, entity_type, entity_id, metadata)
     VALUES ($1, 'INVITACION_FAMILIA', $2, $3, 'family_invitation', $4, $5::jsonb)`,
    [userId, title, body, entityId, JSON.stringify(metadata)]
  );
}
