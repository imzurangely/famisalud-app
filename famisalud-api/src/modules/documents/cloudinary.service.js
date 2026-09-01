import { cloudinary, cloudinaryConfigured } from '../../config/cloudinary.js';
import { AppError } from '../../shared/utils/AppError.js';

export async function uploadDocument(buffer, filename, mimeType) {
  if (!cloudinaryConfigured) {
    throw new AppError('Cloudinary no está configurado.', 503);
  }

  const encoded = buffer.toString('base64');
  const dataUri = `data:${mimeType};base64,${encoded}`;

  return cloudinary.uploader.upload(dataUri, {
    resource_type: 'auto',
    folder: 'famisalud/documents',
    use_filename: false,
    unique_filename: true,
    context: {
      original_filename: filename
    }
  });
}

export async function deleteDocument(publicId, resourceType = 'raw') {
  if (!cloudinaryConfigured) {
    throw new AppError('Cloudinary no está configurado.', 503);
  }

  return cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
    invalidate: true
  });
}
