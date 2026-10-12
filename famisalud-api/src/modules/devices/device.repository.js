const SELECT = `
  id, user_id, device_token, os_type,
  device_name, is_active, created_at, updated_at
`;

export async function list(client, userId) {
  const result = await client.query(
    `SELECT ${SELECT}
     FROM user_devices
     WHERE user_id = $1
     ORDER BY is_active DESC, updated_at DESC`,
    [userId]
  );

  return result.rows;
}

export async function findById(client, deviceId, userId) {
  const result = await client.query(
    `SELECT ${SELECT}
     FROM user_devices
     WHERE id = $1 AND user_id = $2
     LIMIT 1`,
    [deviceId, userId]
  );

  return result.rows[0] ?? null;
}

export async function findByToken(client, deviceToken) {
  const result = await client.query(
    `SELECT ${SELECT}
     FROM user_devices
     WHERE device_token = $1
     LIMIT 1`,
    [deviceToken]
  );

  return result.rows[0] ?? null;
}

export async function create(client, userId, data) {
  const result = await client.query(
    `INSERT INTO user_devices (
      user_id, device_token, os_type, device_name
    ) VALUES ($1, $2, $3, $4)
    RETURNING ${SELECT}`,
    [userId, data.deviceToken, data.osType, data.deviceName ?? null]
  );

  return result.rows[0];
}

export async function update(client, deviceId, userId, data) {
  const result = await client.query(
    `UPDATE user_devices
     SET is_active = COALESCE($3, is_active),
         os_type = COALESCE($4, os_type),
         device_name = COALESCE($5, device_name),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND user_id = $2
     RETURNING ${SELECT}`,
    [deviceId, userId, data.isActive ?? null, data.osType ?? null, data.deviceName ?? null]
  );

  return result.rows[0] ?? null;
}
