const SELECT = `
  id, user_id, notification_type, title, body,
  entity_type, entity_id, is_read, created_at, read_at
`;

export async function list(client, userId, { unreadOnly = false, notificationType, limit = 50 }) {
  const conditions = ['user_id = $1'];
  const values = [userId];
  let index = 2;

  if (unreadOnly) {
    conditions.push('is_read = FALSE');
  }

  if (notificationType) {
    conditions.push(`notification_type = $${index++}`);
    values.push(notificationType);
  }

  values.push(limit);

  const result = await client.query(
    `SELECT ${SELECT}
     FROM notifications
     WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC
     LIMIT $${index}`,
    values
  );

  return result.rows;
}

export async function countUnread(client, userId) {
  const result = await client.query(
    `SELECT COUNT(*)::int AS count
     FROM notifications
     WHERE user_id = $1 AND is_read = FALSE`,
    [userId]
  );

  return result.rows[0].count;
}

export async function findById(client, notificationId, userId) {
  const result = await client.query(
    `SELECT ${SELECT}
     FROM notifications
     WHERE id = $1 AND user_id = $2
     LIMIT 1`,
    [notificationId, userId]
  );

  return result.rows[0] ?? null;
}

export async function markAsRead(client, notificationId, userId) {
  const result = await client.query(
    `UPDATE notifications
     SET is_read = TRUE,
         read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
     WHERE id = $1
       AND user_id = $2
       AND is_read = FALSE
     RETURNING ${SELECT}`,
    [notificationId, userId]
  );

  return result.rows[0] ?? null;
}

export async function markAllAsRead(client, userId) {
  const result = await client.query(
    `UPDATE notifications
     SET is_read = TRUE,
         read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
     WHERE user_id = $1
       AND is_read = FALSE`,
    [userId]
  );

  return result.rowCount;
}
