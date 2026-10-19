import { personMemberScope } from '../../shared/utils/personMemberScope.js';

export async function list(client, memberId) {
  const result = await client.query(
    `SELECT id, member_id, full_name, phone, relationship, custom_relationship, is_primary, notes, created_at, updated_at
     FROM emergency_contacts
     WHERE ${personMemberScope('member_id', '$1')} AND deleted_at IS NULL
     ORDER BY is_primary DESC, full_name ASC`, [memberId]);
  return result.rows;
}

export async function findById(client, id, memberId) {
  const result = await client.query(
    `SELECT id, member_id, full_name, phone, relationship, custom_relationship, is_primary, notes, created_at, updated_at
     FROM emergency_contacts
     WHERE id = $1 AND ${personMemberScope('member_id', '$2')} AND deleted_at IS NULL LIMIT 1`, [id, memberId]);
  return result.rows[0] ?? null;
}

export async function create(client, memberId, data) {
  const result = await client.query(
    `INSERT INTO emergency_contacts (member_id, full_name, phone, relationship, custom_relationship, is_primary, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, member_id, full_name, phone, relationship, custom_relationship, is_primary, notes, created_at, updated_at`,
    [
      memberId,
      data.fullName,
      data.phone,
      data.relationship ?? 'OTRO',
      data.customRelationship ?? null,
      data.isPrimary ?? false,
      data.notes ?? null
    ]
  );
  return result.rows[0];
}

export async function clearPrimary(client, memberId, excludedId = null) {
  await client.query(
    `UPDATE emergency_contacts
     SET is_primary = FALSE, updated_at = CURRENT_TIMESTAMP
     WHERE ${personMemberScope('member_id', '$1')}
       AND deleted_at IS NULL
       AND ($2::uuid IS NULL OR id <> $2)
       AND is_primary = TRUE`, [memberId, excludedId]);
}

export async function update(client, id, memberId, data) {
  const fields = {
    fullName: 'full_name',
    phone: 'phone',
    relationship: 'relationship',
    customRelationship: 'custom_relationship',
    isPrimary: 'is_primary',
    notes: 'notes'
  };

  const entries = Object.entries(data).filter(([key, value]) => key in fields && value !== undefined);
  const assignments = entries.map(([key], index) => `${fields[key]} = $${index + 3}`);
  const values = entries.map(([, value]) => value ?? null);
  const result = await client.query(
    `UPDATE emergency_contacts
     SET ${assignments.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND ${personMemberScope('member_id', '$2')} AND deleted_at IS NULL
     RETURNING id, member_id, full_name, phone, relationship, custom_relationship, is_primary, notes, created_at, updated_at`,
    [id, memberId, ...values]
  );
  return result.rows[0] ?? null;
}

export async function softDelete(client, id, memberId) {
  const result = await client.query(
    `UPDATE emergency_contacts
     SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND ${personMemberScope('member_id', '$2')} AND deleted_at IS NULL
     RETURNING id, member_id, deleted_at`, [id, memberId]);
  return result.rows[0] ?? null;
}
