import { Readable } from 'node:stream';
import { AppError } from '../../shared/utils/AppError.js';
import { HTTP_STATUS } from '../../shared/constants/http.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import * as service from './document.service.js';

export const list = asyncHandler(async (req, res) => {
  const { memberId } = req.validated.params;
  const data = await service.list(memberId, req.user.id, req.validated.query);
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});

export const listByAppointment = asyncHandler(async (req, res) => {
  const { memberId, appointmentId } = req.validated.params;
  const data = await service.listByAppointment(memberId, appointmentId, req.user.id);
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});

export const getById = asyncHandler(async (req, res) => {
  const { memberId, documentId } = req.validated.params;
  const data = await service.getById(memberId, documentId, req.user.id);
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});

export const create = asyncHandler(async (req, res) => {
  const data = await service.create(
    req.validated.params.memberId,
    req.user.id,
    req.validated.body,
    req.file
  );

  res.status(HTTP_STATUS.CREATED).json({ success: true, data });
});

export const update = asyncHandler(async (req, res) => {
  const { memberId, documentId } = req.validated.params;
  const data = await service.update(memberId, documentId, req.user.id, req.validated.body, req.file);
  res.status(HTTP_STATUS.OK).json({ success: true, data });
});

export const remove = asyncHandler(async (req, res) => {
  const { memberId, documentId } = req.validated.params;
  await service.remove(memberId, documentId, req.user.id);
  res.status(HTTP_STATUS.NO_CONTENT).send();
});


export const file = asyncHandler(async (req, res) => {
  const { memberId, documentId } = req.validated.params;
  const download = req.query.download === '1' || req.query.download === 'true';
  const fileData = await service.getFile(memberId, documentId, req.user.id, download);

  let upstream;
  try {
    upstream = await fetch(fileData.deliveryUrl, { redirect: 'follow' });
  } catch (error) {
    console.error('[documents] Cloudinary no respondió al solicitar el archivo:', error);
    throw new AppError('No se pudo abrir el documento almacenado. Inténtalo de nuevo.', 502);
  }

  if (!upstream.ok || !upstream.body) {
    const cloudinaryError = upstream.headers.get('x-cld-error');
    console.error('[documents] Error al descargar archivo desde Cloudinary:', {
      status: upstream.status,
      detail: cloudinaryError,
      documentId
    });
    throw new AppError('No se pudo abrir el documento almacenado. Comprueba que el archivo siga disponible.', 502);
  }

  const safeFileName = String(fileData.fileName).replace(/[\r\n"\\]/g, '_');
  const encodedFileName = encodeURIComponent(safeFileName);
  res.status(200);
  res.setHeader('Content-Type', fileData.mimeType);
  res.setHeader('Content-Disposition', `${download ? 'attachment' : 'inline'}; filename="documento"; filename*=UTF-8''${encodedFileName}`);
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  Readable.fromWeb(upstream.body).on('error', (error) => {
    console.error('[documents] Error transmitiendo archivo al cliente:', error);
    res.destroy(error);
  }).pipe(res);
});
