import { withTransaction } from '../../config/database.js';
import { AppError } from '../../shared/utils/AppError.js';
import {
  assertCanManageMember,
  assertCanViewMember,
  assertMemberResourceManageAccess,
  assertMemberResourceViewAccess
} from '../../shared/authorization/familyAccess.js';
import { writeAuditLog } from '../../shared/utils/auditLog.js';
import * as repository from './medicalCondition.repository.js';

const RESOURCE = 'medical_conditions';
const TABLE = 'medical_conditions';

export async function list(memberId, userId) {
  return withTransaction(async (client) => {
    await assertCanViewMember(client, memberId, userId);
    return repository.list(client, memberId);
  });
}

export async function getById(memberId, resourceId, userId) {
  return withTransaction(async (client) => {
    await assertMemberResourceViewAccess(client, {
      memberId,
      resourceId,
      userId,
      tableName: TABLE
    });

    const item = await repository.findById(client, resourceId, memberId);

    if (!item) {
      throw new AppError('Registro no encontrado.', 404);
    }

    return item;
  });
}

export async function create(memberId, userId, data) {
  return withTransaction(async (client) => {
    const { member } = await assertCanManageMember(client, memberId, userId);
    const item = await repository.create(client, memberId, data);

    await writeAuditLog(client, {
      userId,
      familyId: member.family_id,
      action: 'CREATE',
      entity: RESOURCE,
      entityId: item.id,
      changes: { new: item }
    });

    return item;
  });
}

export async function update(memberId, resourceId, userId, data) {
  return withTransaction(async (client) => {
    const { member } = await assertMemberResourceManageAccess(client, {
      memberId,
      resourceId,
      userId,
      tableName: TABLE
    });

    const before = await repository.findById(client, resourceId, memberId);

    if (!before) {
      throw new AppError('Registro no encontrado.', 404);
    }

    const item = await repository.update(client, resourceId, memberId, data);

    if (!item) {
      throw new AppError('Registro no encontrado.', 404);
    }

    await writeAuditLog(client, {
      userId,
      familyId: member.family_id,
      action: 'UPDATE',
      entity: RESOURCE,
      entityId: resourceId,
      changes: { old: before, new: item }
    });

    return item;
  });
}

export async function remove(memberId, resourceId, userId) {
  return withTransaction(async (client) => {
    const { member } = await assertMemberResourceManageAccess(client, {
      memberId,
      resourceId,
      userId,
      tableName: TABLE
    });

    const item = await repository.softDelete(client, resourceId, memberId);

    if (!item) {
      throw new AppError('Registro no encontrado.', 404);
    }

    await writeAuditLog(client, {
      userId,
      familyId: member.family_id,
      action: 'DELETE',
      entity: RESOURCE,
      entityId: resourceId,
      changes: { deletedAt: item.deleted_at }
    });

    return item;
  });
}
