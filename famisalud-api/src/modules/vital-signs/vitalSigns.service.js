import { withTransaction } from '../../config/database.js';
import { AppError } from '../../shared/utils/AppError.js';
import {
  assertCanManageMember,
  assertCanViewMember,
  assertMemberResourceManageAccess,
  assertMemberResourceViewAccess
} from '../../shared/authorization/familyAccess.js';
import * as repository from './vitalSigns.repository.js';

const TABLE = 'vital_signs';

async function getVitalSignForMember(client, vitalSignId, memberId) {
  const vitalSign = await repository.findVitalSignById(client, vitalSignId, memberId);

  if (!vitalSign) {
    throw new AppError('Signo vital no encontrado.', 404);
  }

  return vitalSign;
}

export async function create(memberId, userId, data) {
  return withTransaction(async (client) => {
    await assertCanManageMember(client, memberId, userId);
    return repository.createVitalSign(client, memberId, userId, data);
  });
}

export async function list(memberId, userId) {
  return withTransaction(async (client) => {
    await assertCanViewMember(client, memberId, userId);
    return repository.listVitalSigns(client, memberId);
  });
}

export async function getById(memberId, vitalSignId, userId) {
  return withTransaction(async (client) => {
    await assertMemberResourceViewAccess(client, {
      memberId,
      resourceId: vitalSignId,
      userId,
      tableName: TABLE
    });

    return getVitalSignForMember(client, vitalSignId, memberId);
  });
}

export async function update(memberId, vitalSignId, userId, data) {
  return withTransaction(async (client) => {
    await assertMemberResourceManageAccess(client, {
      memberId,
      resourceId: vitalSignId,
      userId,
      tableName: TABLE
    });

    return repository.updateVitalSign(client, vitalSignId, data);
  });
}

export async function remove(memberId, vitalSignId, userId) {
  return withTransaction(async (client) => {
    await assertMemberResourceManageAccess(client, {
      memberId,
      resourceId: vitalSignId,
      userId,
      tableName: TABLE
    });

    const deleted = await repository.softDeleteVitalSign(client, vitalSignId);

    if (!deleted) {
      throw new AppError('Signo vital no encontrado.', 404);
    }

    return deleted;
  });
}
