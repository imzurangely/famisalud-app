import { cloudinary, cloudinaryConfigured } from '../../config/cloudinary.js';
import { AppError } from '../../shared/utils/AppError.js';

export async function uploadProfileAvatar(buffer, _filename, mimeType, userId) {
  if (!cloudinaryConfigured) {
    throw new AppError('La carga de imágenes no está disponible porque falta configurar Cloudinary en la API.', 503);
  }

  const dataUri = `data:${mimeType};base64,${buffer.toString('base64')}`;
  return cloudinary.uploader.upload(dataUri, {
    resource_type: 'image',
    public_id: `famisalud/avatars/${userId}`,
    overwrite: true,
    invalidate: true,
    format: mimeType === 'image/jpeg' ? 'jpg' : mimeType.split('/')[1],
    transformation: [{ width: 640, height: 640, crop: 'fill', gravity: 'face', quality: 'auto', fetch_format: 'auto' }],
  });
}
