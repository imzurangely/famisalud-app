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

    if (membership.role !== 'ADMINISTRADOR' && (data.relationship !== undefined || data.customRelationship !== undefined)) {
      throw new AppError('Solo un administrador puede modificar el parentesco dentro de la familia.', 403);
    }

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


export async function createFamily(userId, data) {
  return withTransaction(async (client) => {
    const user = await repository.findActiveUser(client, userId);
    if (!user) throw new AppError('Usuario no encontrado o inactivo.', 401);

    const family = await repository.createFamily(client, data);
    const membership = await repository.addFamilyMembership(client, family.id, userId, 'ADMINISTRADOR');
    const member = await repository.createSelfMember(client, family.id, user);

    await writeAuditLog(client, {
      userId,
      familyId: family.id,
      action: 'CREATE',
      entity: 'families',
      entityId: family.id,
      changes: { new: family }
    });
    await writeAuditLog(client, {
      userId,
      familyId: family.id,
      action: 'CREATE',
      entity: 'family_users',
      entityId: membership.id,
      changes: { new: membership }
    });
    await writeAuditLog(client, {
      userId,
      familyId: family.id,
      action: 'CREATE',
      entity: 'family_members',
      entityId: member.id,
      changes: { new: { id: member.id, person_id: member.person_id, relationship: member.relationship } }
    });

    return { family, membership, member };
  });
}

export async function listFamilies(userId) {
  return withTransaction((client) => repository.listFamiliesByUser(client, userId));
}

export async function linkAccount(familyId, memberId, userId, data) {
  return withTransaction(async (client) => {
    await assertCanManageFamily(client, familyId, userId);

    const member = await repository.findFamilyMemberForUpdate(client, familyId, memberId);
    if (!member) throw new AppError('Miembro no encontrado en esta familia.', 404);

    const targetUser = await repository.findActiveUserByEmail(client, data.email);
    if (!targetUser) throw new AppError('No existe una cuenta activa con ese correo.', 404);

    const membership = await repository.findMembership(client, familyId, targetUser.id);
    if (!membership) {
      throw new AppError('El usuario debe aceptar una invitación a esta familia antes de vincular su cuenta.', 409);
    }

    if (member.linked_user_id) {
      if (member.linked_user_id === targetUser.id) return member;
      throw new AppError('Este perfil está vinculado a otra cuenta.', 409);
    }

    const alreadyLinked = await repository.findLinkedMemberByUser(client, familyId, targetUser.id);
    if (alreadyLinked && alreadyLinked.id !== memberId) {
      throw new AppError('Esta persona ya tiene un perfil activo en la familia.', 409);
    }

    const linked = await repository.linkMemberToUser(client, memberId, targetUser.id);
    if (!linked) throw new AppError('No fue posible vincular la cuenta.', 409);
    if (linked.conflict === 'PERSON_LINKED_TO_OTHER_ACCOUNT') {
      throw new AppError('La identidad de este perfil ya está vinculada a otra cuenta.', 409);
    }
    if (linked.conflict === 'DUPLICATE_ACTIVE_PROFILE') {
      throw new AppError('La persona ya tiene otro perfil activo en una de sus familias; no se puede fusionar automáticamente.', 409);
    }

    await writeAuditLog(client, {
      userId,
      familyId,
      action: 'LINK_ACCOUNT',
      entity: 'family_members',
      entityId: memberId,
      changes: {
        old: { person_id: member.person_id, linked_user_id: null },
        new: { person_id: linked.person_id, linked_user_id: targetUser.id, email: targetUser.email }
      }
    });

    return linked;
  });
}

export async function transferAdministrator(familyId, userId, data) {
  return withTransaction(async (client) => {
    const memberships = await repository.findActiveMembershipsForUpdate(client, familyId);
    const current = memberships.find((item) => item.user_id === userId);
    if (!current) throw new AppError('No tienes acceso a esta familia.', 403);
    if (current.role !== 'ADMINISTRADOR') throw new AppError('Solo un administrador puede transferir el rol.', 403);
    if (data.newAdminUserId === userId) throw new AppError('Ya eres administrador de esta familia.', 422);

    const target = memberships.find((item) => item.user_id === data.newAdminUserId);
    if (!target) throw new AppError('El usuario destino no es un miembro activo de esta familia.', 404);
    if (target.role === 'ADMINISTRADOR') throw new AppError('El usuario destino ya es administrador.', 409);

    const promoted = await repository.updateMembershipRole(client, target.id, 'ADMINISTRADOR');
    const demoted = await repository.updateMembershipRole(client, current.id, 'MIEMBRO');

    await writeAuditLog(client, {
      userId,
      familyId,
      action: 'TRANSFER_ADMINISTRATOR_OUT',
      entity: 'family_users',
      entityId: demoted.id,
      changes: { old: { role: 'ADMINISTRADOR' }, new: { role: 'MIEMBRO' }, transferredTo: promoted.user_id }
    });
    await writeAuditLog(client, {
      userId,
      familyId,
      action: 'TRANSFER_ADMINISTRATOR_IN',
      entity: 'family_users',
      entityId: promoted.id,
      changes: { old: { role: target.role }, new: { role: 'ADMINISTRADOR' }, transferredFrom: demoted.user_id }
    });

    return {
      previousAdministrator: demoted,
      newAdministrator: promoted
    };
  });
}

export async function leaveFamily(familyId, userId) {
  return withTransaction(async (client) => {
    const memberships = await repository.findActiveMembershipsForUpdate(client, familyId);
    const membership = memberships.find((item) => item.user_id === userId);
    if (!membership) throw new AppError('No perteneces a esta familia.', 404);

    if (membership.role === 'ADMINISTRADOR') {
      const activeAdminCount = memberships.filter((item) => item.role === 'ADMINISTRADOR').length;
      if (activeAdminCount <= 1) {
        throw new AppError('Antes de salir, transfiere el rol a otro administrador de la familia.', 409);
      }
    }

    const left = await repository.leaveFamily(client, membership.id);
    if (!left) throw new AppError('No fue posible salir de la familia.', 409);

    await writeAuditLog(client, {
      userId,
      familyId,
      action: 'LEAVE',
      entity: 'family_users',
      entityId: membership.id,
      changes: {
        old: { role: membership.role, left_at: null },
        new: { role: membership.role, left_at: left.left_at }
      }
    });

    return { familyId, leftAt: left.left_at };
  });
}

export async function listFamilyAuditLogs(familyId, userId, limit) {
  return withTransaction(async (client) => {
    await assertCanManageFamily(client, familyId, userId);
    return repository.listAuditLogs(client, familyId, limit);
  });
}
