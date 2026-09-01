import { withTransaction } from '../../config/database.js';
import { AppError } from '../../shared/utils/AppError.js';
import {
  assertCanManageMember,
  assertCanViewMember,
  assertMemberResourceManageAccess,
  assertMemberResourceViewAccess
} from '../../shared/authorization/familyAccess.js';
import { writeAuditLog } from '../../shared/utils/auditLog.js';
import * as repository from './eps.repository.js';

const TABLE = 'insurance_plans';
const RESOURCE = 'insurance_plans';

export async function listCompanies() {
  return withTransaction((client) => repository.listCompanies(client));
}

export async function getCompany(epsId) {
  return withTransaction(async (client) => {
    const company = await repository.findCompanyById(client, epsId);

    if (!company) {
      throw new AppError('EPS no encontrada o inactiva.', 404);
    }

    return company;
  });
}

export async function listPlans(memberId, userId) {
  return withTransaction(async (client) => {
    await assertCanViewMember(client, memberId, userId);
    return repository.listPlans(client, memberId);
  });
}

export async function getPlan(memberId, insurancePlanId, userId) {
  return withTransaction(async (client) => {
    await assertMemberResourceViewAccess(client, {
      memberId,
      resourceId: insurancePlanId,
      userId,
      tableName: TABLE
    });

    const plan = await repository.findPlanById(client, insurancePlanId, memberId);

    if (!plan) {
      throw new AppError('Información de afiliación no encontrada.', 404);
    }

    return plan;
  });
}

export async function createPlan(memberId, userId, data) {
  return withTransaction(async (client) => {
    const { member } = await assertCanManageMember(client, memberId, userId);
    const eps = await repository.findCompanyById(client, data.epsId);

    if (!eps) {
      throw new AppError('La EPS seleccionada no existe o está inactiva.', 422);
    }

    const currentPlan = await repository.findActivePlanByMember(client, memberId);

    if (currentPlan && currentPlan.eps_id === data.epsId) {
      throw new AppError(
        'El miembro ya tiene esta EPS activa. Actualiza sus datos mediante PATCH.',
        409
      );
    }

    if (currentPlan) {
      await repository.softDeletePlan(client, currentPlan.id, memberId);

      await writeAuditLog(client, {
        userId,
        familyId: member.family_id,
        action: 'DELETE',
        entity: RESOURCE,
        entityId: currentPlan.id,
        changes: { reason: 'Cambio de EPS', old: currentPlan }
      });
    }

    const plan = await repository.createPlan(client, memberId, data);

    if (!plan) {
      throw new AppError('La EPS seleccionada no existe o está inactiva.', 422);
    }

    await writeAuditLog(client, {
      userId,
      familyId: member.family_id,
      action: 'CREATE',
      entity: RESOURCE,
      entityId: plan.id,
      changes: {
        new: plan,
        replacedPlanId: currentPlan?.id ?? null
      }
    });

    return repository.findPlanById(client, plan.id, memberId);
  });
}

export async function updatePlan(memberId, insurancePlanId, userId, data) {
  return withTransaction(async (client) => {
    const { member } = await assertMemberResourceManageAccess(client, {
      memberId,
      resourceId: insurancePlanId,
      userId,
      tableName: TABLE
    });

    const before = await repository.findPlanById(client, insurancePlanId, memberId);

    if (!before) {
      throw new AppError('Información de afiliación no encontrada.', 404);
    }

    if (data.epsId !== undefined) {
      const eps = await repository.findCompanyById(client, data.epsId);

      if (!eps) {
        throw new AppError('La EPS seleccionada no existe o está inactiva.', 422);
      }
    }

    const updated = await repository.updatePlan(client, insurancePlanId, memberId, data);

    if (!updated) {
      throw new AppError('Información de afiliación no encontrada.', 404);
    }

    await writeAuditLog(client, {
      userId,
      familyId: member.family_id,
      action: 'UPDATE',
      entity: RESOURCE,
      entityId: insurancePlanId,
      changes: { old: before, new: updated }
    });

    return repository.findPlanById(client, insurancePlanId, memberId);
  });
}

export async function removePlan(memberId, insurancePlanId, userId) {
  return withTransaction(async (client) => {
    const { member } = await assertMemberResourceManageAccess(client, {
      memberId,
      resourceId: insurancePlanId,
      userId,
      tableName: TABLE
    });

    const before = await repository.findPlanById(client, insurancePlanId, memberId);

    if (!before) {
      throw new AppError('Información de afiliación no encontrada.', 404);
    }

    const deleted = await repository.softDeletePlan(client, insurancePlanId, memberId);

    if (!deleted) {
      throw new AppError('Información de afiliación no encontrada.', 404);
    }

    await writeAuditLog(client, {
      userId,
      familyId: member.family_id,
      action: 'DELETE',
      entity: RESOURCE,
      entityId: insurancePlanId,
      changes: { old: before }
    });

    return deleted;
  });
}
