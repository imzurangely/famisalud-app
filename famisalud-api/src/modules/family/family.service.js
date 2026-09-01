import { withTransaction } from '../../config/database.js';
import { AppError } from '../../shared/utils/AppError.js';
import {
  assertCanManageFamily,
  assertCanManageMember,
  assertCanViewMember,
  findActiveMembership
} from '../../shared/authorization/familyAccess.js';
import { writeAuditLog } from '../../shared/utils/auditLog.js';
import * as repository from './family.repository.js';

export async function listMembers(familyId, userId) {
  return withTransaction(async (client) => {
    const membership = await findActiveMembership(client, familyId, userId);

    if (!membership) {
      throw new AppError('No tienes acceso a esta familia.', 403);
    }

    return repository.listMembersByFamily(client, familyId);
  });
}

export async function createMember(familyId, userId, data) {
  return withTransaction(async (client) => {
    await assertCanManageFamily(client, familyId, userId);

    const member = await repository.createMember(client, familyId, data);

    await writeAuditLog(client, {
      userId,
      familyId,
      action: 'CREATE',
      entity: 'family_members',
      entityId: member.id,
      changes: { new: member }
    });

    return member;
  });
}

export async function getMember(memberId, userId) {
  return withTransaction(async (client) => {
    const { member } = await assertCanViewMember(client, memberId, userId);
    return member;
  });
}

export async function updateMember(memberId, userId, data) {
  return withTransaction(async (client) => {
    const { member: current, membership } = await assertCanManageMember(client, memberId, userId);

    const relationshipWasProvided = data.relationship !== undefined;
    const customRelationshipWasProvided = data.customRelationship !== undefined;
    const genderWasProvided = data.gender !== undefined;
    const customGenderWasProvided = data.customGender !== undefined;

    const relationship = relationshipWasProvided ? data.relationship : current.relationship;
    const gender = genderWasProvided ? data.gender : current.gender;

    const customRelationship = relationshipWasProvided
      ? relationship === 'OTRO'
        ? customRelationshipWasProvided
          ? data.customRelationship
          : null
        : null
      : customRelationshipWasProvided
        ? data.customRelationship
        : current.custom_relationship;

    const customGender = genderWasProvided
      ? gender === 'OTRO'
        ? customGenderWasProvided
          ? data.customGender
          : null
        : null
      : customGenderWasProvided
        ? data.customGender
        : current.custom_gender;

    if (relationship === 'OTRO' && !customRelationship) {
      throw new AppError('Es obligatorio indicar la relación personalizada.', 422);
    }

    if (relationship !== 'OTRO' && customRelationship) {
      throw new AppError('No debe existir una relación personalizada.', 422);
    }

    if (gender === 'OTRO' && !customGender) {
      throw new AppError('Es obligatorio indicar el género personalizado.', 422);
    }

    if (gender !== 'OTRO' && customGender) {
      throw new AppError('No debe existir un género personalizado.', 422);
    }

    const normalizedData = { ...data };

    if (relationshipWasProvided || customRelationshipWasProvided) {
      normalizedData.relationship = relationship;
      normalizedData.customRelationship = customRelationship;
    }

    if (genderWasProvided || customGenderWasProvided) {
      normalizedData.gender = gender;
      normalizedData.customGender = customGender;
    }

    const updated = await repository.updateMember(client, memberId, normalizedData);

    if (!updated) {
      throw new AppError('Miembro no encontrado.', 404);
    }

    await writeAuditLog(client, {
      userId,
      familyId: membership.family_id,
      action: 'UPDATE',
      entity: 'family_members',
      entityId: memberId,
      changes: { old: current, new: updated }
    });

    return updated;
  });
}

export async function deleteMember(memberId, userId) {
  return withTransaction(async (client) => {
    const { member, membership } = await assertCanViewMember(client, memberId, userId);

    if (membership.role !== 'ADMINISTRADOR') {
      throw new AppError('Solo un administrador puede eliminar miembros.', 403);
    }

    const deleted = await repository.softDeleteMember(client, memberId);

    if (!deleted) {
      throw new AppError('Miembro no encontrado.', 404);
    }

    await writeAuditLog(client, {
      userId,
      familyId: member.family_id,
      action: 'DELETE',
      entity: 'family_members',
      entityId: memberId,
      changes: { deletedAt: deleted.deleted_at }
    });

    return deleted;
  });
}
