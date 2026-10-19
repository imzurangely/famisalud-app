import { personMemberScope } from '../../shared/utils/personMemberScope.js';

export async function listCompanies(client) {
  const result = await client.query(
    `SELECT id, name, code, is_active, created_at
     FROM eps_companies
     WHERE is_active = TRUE
     ORDER BY name ASC`
  );
  return result.rows;
}

export async function findCompanyById(client, epsId) {
  const result = await client.query(
    `SELECT id, name, code, is_active, created_at
     FROM eps_companies
     WHERE id = $1 AND is_active = TRUE
     LIMIT 1`, [epsId]
  );
  return result.rows[0] ?? null;
}

export async function listPlans(client, memberId) {
  const result = await client.query(
    `SELECT ip.id, ip.member_id, ip.eps_id, e.name AS eps_name, e.code AS eps_code,
            ip.plan_number, ip.contributor_type, ip.contact_phone, ip.website, ip.notes,
            ip.created_at, ip.updated_at
     FROM insurance_plans ip
     JOIN eps_companies e ON e.id = ip.eps_id
     WHERE ${personMemberScope('ip.member_id', '$1')} AND ip.deleted_at IS NULL
     ORDER BY ip.created_at DESC`, [memberId]
  );
  return result.rows;
}

export async function findPlanById(client, insurancePlanId, memberId) {
  const result = await client.query(
    `SELECT ip.id, ip.member_id, ip.eps_id, e.name AS eps_name, e.code AS eps_code,
            ip.plan_number, ip.contributor_type, ip.contact_phone, ip.website, ip.notes,
            ip.created_at, ip.updated_at
     FROM insurance_plans ip
     JOIN eps_companies e ON e.id = ip.eps_id
     WHERE ip.id = $1 AND ${personMemberScope('ip.member_id', '$2')} AND ip.deleted_at IS NULL
     LIMIT 1`, [insurancePlanId, memberId]
  );
  return result.rows[0] ?? null;
}

export async function findActivePlanByMember(client, memberId) {
  const result = await client.query(
    `SELECT id, member_id, eps_id, plan_number, contributor_type, contact_phone, website, notes,
            created_at, updated_at
     FROM insurance_plans
     WHERE ${personMemberScope('member_id', '$1')} AND deleted_at IS NULL
     ORDER BY created_at DESC
     LIMIT 1
     FOR UPDATE`,
    [memberId]
  );
  return result.rows[0] ?? null;
}

export async function createPlan(client, memberId, data) {
  const result = await client.query(
    `INSERT INTO insurance_plans (member_id, eps_id, plan_number, contributor_type, contact_phone, website, notes)
     SELECT $1, e.id, $3, $4, $5, $6, $7
     FROM eps_companies e
     WHERE e.id = $2
       AND e.is_active = TRUE
     RETURNING id, member_id, eps_id, plan_number, contributor_type, contact_phone, website, notes,
               created_at, updated_at`,
    [memberId, data.epsId, data.planNumber ?? null, data.contributorType ?? null, data.contactPhone ?? null, data.website ?? null, data.notes ?? null]
  );
  return result.rows[0] ?? null;
}

export async function updatePlan(client, insurancePlanId, memberId, data) {
  const fields = {
    epsId: 'eps_id', planNumber: 'plan_number', contributorType: 'contributor_type',
    contactPhone: 'contact_phone', website: 'website', notes: 'notes'
  };
  const entries = Object.entries(data).filter(([key, value]) => key in fields && value !== undefined);
  const assignments = entries.map(([key], index) => `${fields[key]} = $${index + 3}`);
  const values = entries.map(([, value]) => value ?? null);
  const result = await client.query(
    `UPDATE insurance_plans
     SET ${assignments.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND ${personMemberScope('member_id', '$2')} AND deleted_at IS NULL
     RETURNING id, member_id, eps_id, plan_number, contributor_type, contact_phone, website, notes,
               created_at, updated_at`,
    [insurancePlanId, memberId, ...values]
  );
  return result.rows[0] ?? null;
}

export async function softDeletePlan(client, insurancePlanId, memberId) {
  const result = await client.query(
    `UPDATE insurance_plans
     SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND ${personMemberScope('member_id', '$2')} AND deleted_at IS NULL
     RETURNING id, member_id, eps_id, deleted_at`, [insurancePlanId, memberId]
  );
  return result.rows[0] ?? null;
}
