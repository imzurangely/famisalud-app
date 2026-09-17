import multer from 'multer';
import { AppError } from '../../shared/utils/AppError.js';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp'
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1
  },
  fileFilter: (req, file, callback) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return callback(new AppError('Tipo de archivo no permitido. Solo se aceptan PDF, JPG, JPEG, PNG y WEBP.', 422));
    }

    callback(null, true);
  }
});

export function handleDocumentUpload(req, res, next) {
  upload.single('file')(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError('El archivo no puede superar los 10 MB.', 422));
      }

      if (error.code === 'LIMIT_UNEXPECTED_FILE') {
        return next(new AppError('Solo se permite un archivo en el campo file.', 422));
      }
    }

    return next(error);
  });
}
