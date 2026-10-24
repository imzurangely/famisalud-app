export async function findUserByEmail(client, email) {
  const result = await client.query(
    `SELECT u.id, u.person_id, p.first_name, p.last_name, u.email,
            u.password_hash, p.birth_date, p.gender, p.custom_gender, p.blood_type,
            p.phone, p.sisben, p.stratum, p.avatar_url, u.timezone, u.locale,
            u.is_verified, u.is_active, u.deleted_at, u.created_at
     FROM users u
     JOIN persons p ON p.id = u.person_id
     WHERE u.email = $1 AND u.deleted_at IS NULL
     LIMIT 1`,
    [email]
  );
  return result.rows[0] ?? null;
}

export async function findUserById(client, userId) {
  const result = await client.query(
    `SELECT u.id, u.person_id, p.first_name, p.last_name, u.email,
            p.birth_date, p.gender, p.custom_gender, p.blood_type, p.phone,
            p.sisben, p.stratum, p.avatar_url, u.timezone, u.locale, u.is_verified,
            u.is_active, u.created_at
     FROM users u
     JOIN persons p ON p.id = u.person_id
     WHERE u.id = $1 AND u.deleted_at IS NULL AND u.is_active = TRUE
     LIMIT 1`,
    [userId]
  );
  return result.rows[0] ?? null;
}

export async function createUser(client, data, passwordHash) {
  const personResult = await client.query(
    `INSERT INTO persons (first_name, last_name, phone)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [data.firstName, data.lastName, data.phone ?? null]
  );

  const personId = personResult.rows[0].id;
  const userResult = await client.query(
    `INSERT INTO users (person_id, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [personId, data.email, passwordHash]
  );

  return findUserById(client, userResult.rows[0].id);
}

export async function updatePasswordHash(client, userId, passwordHash) {
  await client.query('UPDATE users SET password_hash = $2 WHERE id = $1', [userId, passwordHash]);
}

export async function createSession(client, data) {
  const result = await client.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, ip_address, last_used_at)
     VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
     RETURNING id, user_id, expires_at, created_at, last_used_at, user_agent, ip_address`,
    [data.userId, data.tokenHash, data.expiresAt, data.userAgent ?? null, data.ipAddress ?? null]
  );
  return result.rows[0];
}

export async function findSessionByRefreshHashForUpdate(client, tokenHash) {
  const result = await client.query(
    `SELECT rt.id, rt.user_id, rt.token_hash, rt.expires_at, rt.revoked_at,
            u.is_active, u.deleted_at
     FROM refresh_tokens rt
     JOIN users u ON u.id = rt.user_id
     WHERE rt.token_hash = $1
     LIMIT 1
     FOR UPDATE OF rt`,
    [tokenHash]
  );
  return result.rows[0] ?? null;
}

export async function rotateSession(client, sessionId, oldHash, newHash, expiresAt, metadata) {
  const result = await client.query(
    `UPDATE refresh_tokens
     SET token_hash = $3,
         expires_at = $4,
         last_used_at = CURRENT_TIMESTAMP,
         user_agent = COALESCE($5, user_agent),
         ip_address = COALESCE($6, ip_address)
     WHERE id = $1 AND token_hash = $2 AND revoked_at IS NULL
     RETURNING id, user_id, expires_at`,
    [sessionId, oldHash, newHash, expiresAt, metadata.userAgent ?? null, metadata.ipAddress ?? null]
  );
  return result.rows[0] ?? null;
}

export async function revokeSessionByRefreshHash(client, tokenHash) {
  const result = await client.query(
    `UPDATE refresh_tokens
     SET revoked_at = CURRENT_TIMESTAMP
     WHERE token_hash = $1 AND revoked_at IS NULL
     RETURNING id`,
    [tokenHash]
  );
  return result.rows[0] ?? null;
}

export async function listSessions(client, userId) {
  const result = await client.query(
    `SELECT id, created_at, last_used_at, expires_at, user_agent, ip_address
     FROM refresh_tokens
     WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > CURRENT_TIMESTAMP
     ORDER BY last_used_at DESC NULLS LAST, created_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function revokeSessionById(client, userId, sessionId) {
  const result = await client.query(
    `UPDATE refresh_tokens
     SET revoked_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL
     RETURNING id`,
    [sessionId, userId]
  );
  return result.rows[0] ?? null;
}

export async function revokeAllSessions(client, userId) {
  const result = await client.query(
    `UPDATE refresh_tokens
     SET revoked_at = CURRENT_TIMESTAMP
     WHERE user_id = $1 AND revoked_at IS NULL
     RETURNING id`,
    [userId]
  );
  return result.rowCount;
}

export async function hasRecentResetCode(client, userId) {
  const result = await client.query(
    `SELECT id
     FROM password_reset_codes
     WHERE user_id = $1
       AND used_at IS NULL
       AND created_at > CURRENT_TIMESTAMP - INTERVAL '1 minute'
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId]
  );
  return Boolean(result.rows[0]);
}

export async function consumeOutstandingResetCodes(client, userId) {
  await client.query(
    `UPDATE password_reset_codes
     SET used_at = CURRENT_TIMESTAMP
     WHERE user_id = $1 AND used_at IS NULL`,
    [userId]
  );
}

export async function createPasswordResetCode(client, userId, codeHash, expiresAt) {
  const result = await client.query(
    `INSERT INTO password_reset_codes (user_id, code_hash, expires_at, attempts, max_attempts)
     VALUES ($1, $2, $3, 0, 3)
     RETURNING id, expires_at, created_at`,
    [userId, codeHash, expiresAt]
  );
  return result.rows[0];
}

export async function findLatestResetCodeForUpdate(client, userId) {
  const result = await client.query(
    `SELECT id, code_hash, attempts, max_attempts, expires_at, used_at, created_at
     FROM password_reset_codes
     WHERE user_id = $1 AND used_at IS NULL
     ORDER BY created_at DESC
     LIMIT 1
     FOR UPDATE`,
    [userId]
  );
  return result.rows[0] ?? null;
}

export async function incrementResetAttempts(client, resetId) {
  await client.query(
    `UPDATE password_reset_codes
     SET attempts = LEAST(attempts + 1, max_attempts)
     WHERE id = $1 AND used_at IS NULL`,
    [resetId]
  );
}

export async function markResetCodeUsed(client, resetId) {
  await client.query(
    `UPDATE password_reset_codes
     SET used_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND used_at IS NULL`,
    [resetId]
  );
}

export async function updatePasswordAndRevokeSessions(client, userId, passwordHash) {
  await client.query('UPDATE users SET password_hash = $2 WHERE id = $1', [userId, passwordHash]);
  await client.query(
    `UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP
     WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId]
  );
  await client.query(
    `UPDATE password_reset_codes SET used_at = CURRENT_TIMESTAMP
     WHERE user_id = $1 AND used_at IS NULL`,
    [userId]
  );
}

export async function hasActiveFamily(client, userId) {
  const result = await client.query(
    `SELECT 1 FROM family_users WHERE user_id = $1 AND left_at IS NULL LIMIT 1`,
    [userId]
  );
  return Boolean(result.rows[0]);
}


export async function updateOwnProfile(client, userId, data) {
  const result = await client.query(
    `UPDATE persons p
     SET first_name = $2,
         last_name = $3,
         birth_date = $4,
         gender = $5,
         custom_gender = $6,
         blood_type = $7,
         phone = $8,
         sisben = $9,
         stratum = $10,
         updated_at = CURRENT_TIMESTAMP
     FROM users u
     WHERE u.id = $1
       AND u.person_id = p.id
       AND u.deleted_at IS NULL
       AND u.is_active = TRUE
     RETURNING u.id, u.person_id, u.email, u.timezone, u.locale,
               u.is_verified, u.is_active, u.created_at,
               p.first_name, p.last_name, p.birth_date, p.gender,
               p.custom_gender, p.blood_type, p.phone, p.sisben,
               p.stratum, p.avatar_url`,
    [userId, data.firstName, data.lastName, data.birthDate ?? null,
      data.gender ?? null, data.customGender ?? null, data.bloodType ?? null,
      data.phone ?? null, data.sisben ?? null, data.stratum ?? null]
  );
  return result.rows[0] ?? null;
}

export async function updateAvatarUrl(client, userId, avatarUrl) {
  const result = await client.query(
    `UPDATE persons p
     SET avatar_url = $2, updated_at = CURRENT_TIMESTAMP
     FROM users u
     WHERE u.id = $1
       AND u.person_id = p.id
       AND u.deleted_at IS NULL
       AND u.is_active = TRUE
     RETURNING u.id, u.person_id, u.email, u.timezone, u.locale,
               u.is_verified, u.is_active, u.created_at,
               p.first_name, p.last_name, p.birth_date, p.gender,
               p.custom_gender, p.blood_type, p.phone, p.sisben,
               p.stratum, p.avatar_url`,
    [userId, avatarUrl]
  );
  return result.rows[0] ?? null;
}

export async function updatePreferences(client, userId, data) {
  const result = await client.query(
    `UPDATE users
     SET timezone = $2, locale = $3, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND deleted_at IS NULL AND is_active = TRUE
     RETURNING id, person_id, email, timezone, locale, is_verified, is_active, created_at`,
    [userId, data.timezone, data.locale]
  );
  const row = result.rows[0];
  if (!row) return null;
  const person = await findUserById(client, row.id);
  return person;
}
