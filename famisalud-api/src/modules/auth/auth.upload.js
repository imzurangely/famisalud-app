import multer from 'multer';
import { AppError } from '../../shared/utils/AppError.js';

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AVATAR_SIZE, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_AVATAR_TYPES.has(file.mimetype)) {
      return callback(new AppError('Selecciona una imagen JPG, PNG o WEBP.', 422));
    }
    callback(null, true);
  },
});

export function handleAvatarUpload(req, res, next) {
  upload.single('file')(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError('La foto no puede superar los 5 MB.', 422));
      }
      if (error.code === 'LIMIT_UNEXPECTED_FILE') {
        return next(new AppError('Selecciona una sola foto en el campo file.', 422));
      }
    }
    return next(error);
  });
}
