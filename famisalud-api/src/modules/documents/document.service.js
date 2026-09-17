import { withTransaction } from '../../config/database.js';
import { AppError } from '../../shared/utils/AppError.js';
import { assertCanManageMember, assertCanViewMember } from '../../shared/authorization/familyAccess.js';
import { writeAuditLog } from '../../shared/utils/auditLog.js';
import { deleteDocument, uploadDocument } from './cloudinary.service.js';
import * as repository from './document.repository.js';

const RESOURCE = 'documents';
const TABLE = 'documents';

function getCloudinaryResourceType(mimeType) {
  return mimeType?.startsWith('image/') ? 'image' : 'raw';
}

function normalizeCategoryData(data, currentCategory = null, currentCustomCategory = null) {
  const category = data.category ?? currentCategory;

  if (category === 'OTRO') {
    const customCategory = data.customCategory ?? currentCustomCategory;
    return {
      ...data,
      category,
      customCategory: customCategory?.trim() || null
    };
  }

  return {
    ...data,
    category,
    customCategory: null
  };
}

async function validateAppointment(client, appointmentId, memberId) {
  if (!appointmentId) return;

  const belongs = await repository.appointmentBelongsToMember(client, appointmentId, memberId);

  if (!belongs) {
    throw new AppError('La cita indicada no pertenece al miembro o no existe.', 404);
  }
}

export async function list(memberId, userId, filters) {
  return withTransaction(async (client) => {
    await assertCanViewMember(client, memberId, userId);

    if (filters.appointmentId) {
      await validateAppointment(client, filters.appointmentId, memberId);
    }

    return repository.list(client, memberId, filters);
  });
}

export async function listByAppointment(memberId, appointmentId, userId) {
  return withTransaction(async (client) => {
    await assertCanViewMember(client, memberId, userId);
    await validateAppointment(client, appointmentId, memberId);
    return repository.list(client, memberId, { appointmentId });
  });
}

export async function getById(memberId, documentId, userId) {
  return withTransaction(async (client) => {
    await assertCanViewMember(client, memberId, userId);

    const item = await repository.findById(client, documentId, memberId);

    if (!item) {
      throw new AppError('Documento no encontrado.', 404);
    }

    return item;
  });
}

export async function create(memberId, userId, data, file) {
  if (!file) {
    throw new AppError('Debe adjuntar un archivo en el campo file.', 422);
  }

  const uploaded = await uploadDocument(file.buffer, file.originalname, file.mimetype);

  try {
    return await withTransaction(async (client) => {
      const { member } = await assertCanManageMember(client, memberId, userId);
      await validateAppointment(client, data.appointmentId, memberId);

      const item = await repository.create(client, memberId, userId, {
        ...data,
        originalFileName: file.originalname,
        fileUrl: uploaded.secure_url,
        cloudinaryPublicId: uploaded.public_id,
        mimeType: file.mimetype,
        fileSize: file.size
      });

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
  } catch (error) {
    try {
      await deleteDocument(uploaded.public_id, uploaded.resource_type ?? getCloudinaryResourceType(file.mimetype));
    } catch (cleanupError) {
      console.error('[documents] No se pudo eliminar el archivo subido tras fallar la creación:', cleanupError);
    }
    throw error;
  }
}

export async function update(memberId, documentId, userId, data, file) {
  let uploaded = null;
  let oldFile = null;

  if (file) {
    uploaded = await uploadDocument(file.buffer, file.originalname, file.mimetype);
  }

  try {
    const result = await withTransaction(async (client) => {
      const { member } = await assertCanManageMember(client, memberId, userId);

      const before = await repository.findById(client, documentId, memberId);

      if (!before) {
        throw new AppError('Documento no encontrado.', 404);
      }

      if (!file && Object.keys(data).length === 0) {
        throw new AppError('Debe enviar al menos un campo para actualizar o un nuevo archivo.', 422);
      }

      if (data.category === undefined && data.customCategory !== undefined && before.category !== 'OTRO') {
        throw new AppError('customCategory solo puede modificarse cuando la categoría es OTRO.', 422);
      }

      const normalized = normalizeCategoryData(data, before.category, before.custom_category);
      await validateAppointment(client, normalized.appointmentId, memberId);

      const updateData = { ...normalized };

      if (uploaded) {
        oldFile = {
          publicId: before.cloudinary_public_id,
          resourceType: getCloudinaryResourceType(before.mime_type)
        };

        updateData.originalFileName = file.originalname;
        updateData.fileUrl = uploaded.secure_url;
        updateData.cloudinaryPublicId = uploaded.public_id;
        updateData.mimeType = file.mimetype;
        updateData.fileSize = file.size;
      }

      const item = await repository.update(client, documentId, memberId, updateData);

      if (!item) {
        throw new AppError('Documento no encontrado.', 404);
      }

      await writeAuditLog(client, {
        userId,
        familyId: member.family_id,
        action: 'UPDATE',
        entity: RESOURCE,
        entityId: documentId,
        changes: { old: before, new: item }
      });

      return item;
    });

    if (uploaded && oldFile?.publicId) {
      try {
        await deleteDocument(oldFile.publicId, oldFile.resourceType);
      } catch (error) {
        console.error('[documents] No se pudo eliminar el archivo anterior de Cloudinary:', error);
      }
    }

    return result;
  } catch (error) {
    if (uploaded) {
      try {
        await deleteDocument(uploaded.public_id, uploaded.resource_type ?? getCloudinaryResourceType(file.mimetype));
      } catch (cleanupError) {
        console.error('[documents] No se pudo eliminar el nuevo archivo tras fallar la actualización:', cleanupError);
      }
    }
    throw error;
  }
}

export async function remove(memberId, documentId, userId) {
  return withTransaction(async (client) => {
    const { member } = await assertCanManageMember(client, memberId, userId);

    const item = await repository.softDelete(client, documentId, memberId);

    if (!item) {
      throw new AppError('Documento no encontrado.', 404);
    }

    await writeAuditLog(client, {
      userId,
      familyId: member.family_id,
      action: 'DELETE',
      entity: RESOURCE,
      entityId: documentId,
      changes: { deletedAt: item.deleted_at }
    });

    try {
      if (item.cloudinary_public_id) {
        await deleteDocument(item.cloudinary_public_id, getCloudinaryResourceType(item.mime_type));
      }
    } catch (error) {
      console.error('[documents] Documento eliminado de BD pero falló la eliminación en Cloudinary:', error);
    }

    return item;
  });
}
