import { randomUUID } from 'node:crypto';
import { cloudinary, cloudinaryConfigured } from '../../config/cloudinary.js';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/utils/AppError.js';

export async function uploadDocument(buffer, filename, mimeType) {
  if (!cloudinaryConfigured) {
    throw new AppError('Cloudinary no está configurado.', 503);
  }

  const isPdf = mimeType === 'application/pdf';
  const extension = String(filename || '').split('.').pop()?.toLowerCase() || 'pdf';
  const publicId = isPdf ? `${randomUUID()}.${extension === 'pdf' ? extension : 'pdf'}` : randomUUID();
  const encoded = buffer.toString('base64');
  const dataUri = `data:${mimeType};base64,${encoded}`;

  return cloudinary.uploader.upload(dataUri, {
    resource_type: isPdf ? 'raw' : 'image',
    public_id: publicId,
    folder: 'famisalud/documents',
    use_filename: false,
    unique_filename: false,
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

function getDocumentResourceType(fileUrl, mimeType) {
  try {
    const path = new URL(fileUrl).pathname;
    const match = path.match(/\/(image|raw|video)\/(?:upload|private|authenticated)\//);
    if (match) return match[1];
  } catch {
    // Old records may store a non-absolute URL; infer below.
  }
  return mimeType === 'application/pdf' ? 'raw' : mimeType?.startsWith('image/') ? 'image' : 'raw';
}

/**
 * Returns a short-lived signed Cloudinary Admin API URL. The API then proxies
 * its bytes to the authenticated user, so PDF delivery does not depend on the
 * public CDN PDF-delivery setting and the browser never receives Cloudinary credentials.
 */
export async function createDocumentDeliveryUrl({ publicId, fileUrl, mimeType, fileName, download = false }) {
  if (!cloudinaryConfigured) {
    throw new AppError('La consulta de archivos no está disponible porque falta configurar Cloudinary en la API.', 503);
  }
  if (!publicId) throw new AppError('Este documento no tiene un archivo asociado.', 404);

  const resourceType = getDocumentResourceType(fileUrl, mimeType);
  let asset;
  try {
    asset = await cloudinary.api.resource(publicId, {
      resource_type: resourceType,
      type: 'upload'
    });
  } catch (error) {
    console.error('[documents] No se pudo consultar el archivo en Cloudinary:', {
      resourceType,
      publicId,
      httpCode: error?.http_code
    });
    throw new AppError('No pudimos encontrar el archivo guardado. Intenta subirlo nuevamente si el problema continúa.', 502);
  }

  if (!asset?.asset_id) {
    throw new AppError('No pudimos encontrar el archivo guardado. Intenta subirlo nuevamente si el problema continúa.', 404);
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const parametersToSign = {
    asset_id: asset.asset_id,
    timestamp,
    expires_at: timestamp + 300
  };
  const safeFileName = String(fileName || 'documento').replace(/[\r\n"\\]/g, '_');
  if (download) {
    parametersToSign.attachment = true;
    parametersToSign.target_filename = safeFileName;
  }

  const signature = cloudinary.utils.api_sign_request(parametersToSign, env.CLOUDINARY_API_SECRET);
  const query = new URLSearchParams({
    ...Object.fromEntries(Object.entries(parametersToSign).map(([key, value]) => [key, String(value)])),
    api_key: env.CLOUDINARY_API_KEY,
    signature
  });

  return `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/asset/download?${query.toString()}`;
}
