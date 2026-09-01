import { withTransaction } from '../../config/database.js';
import { AppError } from '../../shared/utils/AppError.js';
import {
  assertCanManageMember,
  assertCanViewMember,
  assertMemberResourceManageAccess,
  assertMemberResourceViewAccess
} from '../../shared/authorization/familyAccess.js';
import { writeAuditLog } from '../../shared/utils/auditLog.js';
import * as repository from './emergencyContact.repository.js';

const RESOURCE = 'emergency_contacts';
const TABLE = 'emergency_contacts';

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
    if (!item) throw new AppError('Registro no encontrado.', 404);
    return item;
  });
}

export async function create(memberId, userId, data) {
  return withTransaction(async (client) => {
    const { member } = await assertCanManageMember(client, memberId, userId);

    if (data.isPrimary === true) {
      await repository.clearPrimary(client, memberId);
    }

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
    if (!before) throw new AppError('Registro no encontrado.', 404);

    const updateData = { ...data };

    if (updateData.relationship !== undefined) {
      if (updateData.relationship === 'OTRO') {
        if (updateData.customRelationship === undefined) {
          if (before.relationship === 'OTRO' && before.custom_relationship) {
            updateData.customRelationship = before.custom_relationship;
          }
        }
      } else {
        updateData.customRelationship = null;
      }
    }

    if (updateData.customRelationship !== undefined && updateData.relationship === undefined && before.relationship !== 'OTRO') {
      throw new AppError('No debe enviar una relación personalizada.', 422);
    }

    if (updateData.isPrimary === true) {
      await repository.clearPrimary(client, memberId, resourceId);
    }

    const item = await repository.update(client, resourceId, memberId, updateData);
    if (!item) throw new AppError('Registro no encontrado.', 404);

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
    if (!item) throw new AppError('Registro no encontrado.', 404);

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
