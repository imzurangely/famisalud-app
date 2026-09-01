export async function writeAuditLog(client, {
  userId,
  familyId,
  action,
  entity,
  entityId,
  changes = null
}) {
  await client.query(
    `INSERT INTO audit_logs (user_id, family_id, action, entity, entity_id, changes)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, familyId, action, entity, entityId, changes ? JSON.stringify(changes) : null]
  );
}
