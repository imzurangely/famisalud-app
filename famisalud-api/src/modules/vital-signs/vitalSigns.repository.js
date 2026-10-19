import { personMemberScope } from '../../shared/utils/personMemberScope.js';

export async function findMemberBelongsToFamily(client, memberId) {
  const result = await client.query(
    `SELECT fm.id, fm.family_id, linked_user.id AS linked_user_id, fm.person_id
     FROM family_members fm
     JOIN persons p ON p.id = fm.person_id
     LEFT JOIN users linked_user ON linked_user.person_id = p.id
       AND linked_user.deleted_at IS NULL
     WHERE fm.id = $1 AND fm.deleted_at IS NULL`,
    [memberId]
  );

  return result.rows[0] ?? null;
}

export async function findFamilyMembership(client, familyId, userId) {
  const result = await client.query(
    `SELECT id, role
     FROM family_users
     WHERE family_id = $1 AND user_id = $2 AND left_at IS NULL
     LIMIT 1`,
    [familyId, userId]
  );

  return result.rows[0] ?? null;
}

export async function findVitalSignById(client, vitalSignId, memberId = null) {
  const result = await client.query(
    `SELECT id, member_id, recorded_by_user_id,
            systolic_pressure, diastolic_pressure, heart_rate, respiratory_rate,
            oxygen_saturation, blood_glucose, temperature, weight_kg,
            recorded_at, notes, created_at, updated_at
     FROM vital_signs
     WHERE id = $1
       AND deleted_at IS NULL
       AND ($2::uuid IS NULL OR ${personMemberScope('member_id', '$2')})
     LIMIT 1`,
    [vitalSignId, memberId]
  );

  return result.rows[0] ?? null;
}

export async function createVitalSign(client, memberId, userId, data) {
  const result = await client.query(
    `INSERT INTO vital_signs (
      member_id, recorded_by_user_id,
      systolic_pressure, diastolic_pressure, heart_rate, respiratory_rate,
      oxygen_saturation, blood_glucose, temperature, weight_kg,
      recorded_at, notes
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    RETURNING id, member_id, recorded_by_user_id,
              systolic_pressure, diastolic_pressure, heart_rate, respiratory_rate,
              oxygen_saturation, blood_glucose, temperature, weight_kg,
              recorded_at, notes, created_at, updated_at`,
    [
      memberId,
      userId,
      data.systolicPressure ?? null,
      data.diastolicPressure ?? null,
      data.heartRate ?? null,
      data.respiratoryRate ?? null,
      data.oxygenSaturation ?? null,
      data.bloodGlucose ?? null,
      data.temperature ?? null,
      data.weightKg ?? null,
      data.recordedAt ?? new Date().toISOString(),
      data.notes ?? null
    ]
  );

  return result.rows[0];
}

export async function listVitalSigns(client, memberId) {
  const result = await client.query(
    `SELECT id, member_id, recorded_by_user_id,
            systolic_pressure, diastolic_pressure, heart_rate, respiratory_rate,
            oxygen_saturation, blood_glucose, temperature, weight_kg,
            recorded_at, notes, created_at, updated_at
     FROM vital_signs
     WHERE ${personMemberScope('member_id', '$1')} AND deleted_at IS NULL
     ORDER BY recorded_at DESC
     LIMIT 100`,
    [memberId]
  );

  return result.rows;
}

export async function updateVitalSign(client, vitalSignId, data) {
  const fields = {
    systolicPressure: 'systolic_pressure',
    diastolicPressure: 'diastolic_pressure',
    heartRate: 'heart_rate',
    respiratoryRate: 'respiratory_rate',
    oxygenSaturation: 'oxygen_saturation',
    bloodGlucose: 'blood_glucose',
    temperature: 'temperature',
    weightKg: 'weight_kg',
    recordedAt: 'recorded_at',
    notes: 'notes'
  };

  const entries = Object.entries(data).filter(([key, value]) => key in fields && value !== undefined);

  if (!entries.length) {
    return findVitalSignById(client, vitalSignId);
  }

  const assignments = entries.map(([key], index) => `${fields[key]} = $${index + 2}`);
  const values = entries.map(([, value]) => value ?? null);

  const result = await client.query(
    `UPDATE vital_signs
     SET ${assignments.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING id, member_id, recorded_by_user_id,
               systolic_pressure, diastolic_pressure, heart_rate, respiratory_rate,
               oxygen_saturation, blood_glucose, temperature, weight_kg,
               recorded_at, notes, created_at, updated_at`,
    [vitalSignId, ...values]
  );

  return result.rows[0] ?? null;
}

export async function softDeleteVitalSign(client, vitalSignId) {
  const result = await client.query(
    `UPDATE vital_signs
     SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING id, member_id, deleted_at`,
    [vitalSignId]
  );

  return result.rows[0] ?? null;
}
