const DOCUMENT_SELECT = `
  id,
  member_id,
  appointment_id,
  uploaded_by_user_id,
  title,
  original_file_name,
  category,
  custom_category,
  document_date,
  file_url,
  cloudinary_public_id,
  mime_type,
  file_size,
  created_at,
  updated_at
`;

export async function list(client, memberId, filters = {}) {
  const conditions = ['d.member_id = $1', 'd.deleted_at IS NULL'];
  const values = [memberId];
  let index = 2;

  if (filters.category) {
    conditions.push(`d.category = $${index}`);
    values.push(filters.category);
    index += 1;
  }

  if (filters.appointmentId) {
    conditions.push(`d.appointment_id = $${index}`);
    values.push(filters.appointmentId);
    index += 1;
  }

  if (filters.search) {
    conditions.push(`d.title ILIKE $${index}`);
    values.push(`%${filters.search}%`);
    index += 1;
  }

  const result = await client.query(
    `SELECT ${DOCUMENT_SELECT}
     FROM documents d
     WHERE ${conditions.join(' AND ')}
     ORDER BY d.document_date DESC NULLS LAST, d.created_at DESC`,
    values
  );

  return result.rows;
}

export async function findById(client, documentId, memberId) {
  const result = await client.query(
    `SELECT ${DOCUMENT_SELECT}
     FROM documents
     WHERE id = $1
       AND member_id = $2
       AND deleted_at IS NULL
     LIMIT 1`,
    [documentId, memberId]
  );

  return result.rows[0] ?? null;
}

export async function create(client, memberId, userId, data) {
  const result = await client.query(
    `INSERT INTO documents (
       member_id,
       appointment_id,
       uploaded_by_user_id,
       title,
       original_file_name,
       category,
       custom_category,
       document_date,
       file_url,
       cloudinary_public_id,
       mime_type,
       file_size
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING ${DOCUMENT_SELECT}`,
    [
      memberId,
      data.appointmentId ?? null,
      userId,
      data.title,
      data.originalFileName,
      data.category,
      data.customCategory ?? null,
      data.documentDate ?? null,
      data.fileUrl,
      data.cloudinaryPublicId,
      data.mimeType,
      data.fileSize
    ]
  );

  return result.rows[0];
}

export async function update(client, documentId, memberId, data) {
  const fields = {
    title: 'title',
    category: 'category',
    customCategory: 'custom_category',
    documentDate: 'document_date',
    appointmentId: 'appointment_id',
    originalFileName: 'original_file_name',
    fileUrl: 'file_url',
    cloudinaryPublicId: 'cloudinary_public_id',
    mimeType: 'mime_type',
    fileSize: 'file_size'
  };

  const entries = Object.entries(data).filter(([key, value]) => key in fields && value !== undefined);

  if (entries.length === 0) {
    return findById(client, documentId, memberId);
  }

  const assignments = entries.map(([key], index) => `${fields[key]} = $${index + 3}`);
  const values = entries.map(([, value]) => value ?? null);

  const result = await client.query(
    `UPDATE documents
     SET ${assignments.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
       AND member_id = $2
       AND deleted_at IS NULL
     RETURNING ${DOCUMENT_SELECT}`,
    [documentId, memberId, ...values]
  );

  return result.rows[0] ?? null;
}

export async function softDelete(client, documentId, memberId) {
  const result = await client.query(
    `UPDATE documents
     SET deleted_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
       AND member_id = $2
       AND deleted_at IS NULL
     RETURNING id, member_id, cloudinary_public_id, mime_type, deleted_at`,
    [documentId, memberId]
  );

  return result.rows[0] ?? null;
}

export async function appointmentBelongsToMember(client, appointmentId, memberId) {
  const result = await client.query(
    `SELECT id
     FROM appointments
     WHERE id = $1
       AND member_id = $2
       AND deleted_at IS NULL
     LIMIT 1`,
    [appointmentId, memberId]
  );

  return Boolean(result.rows[0]);
}
