import { env } from '../config/env.js';
import { AppError } from '../shared/utils/AppError.js';

export function devIdentity(req, res, next) {
  if (!env.ENABLE_DEV_AUTH || env.NODE_ENV === 'production') {
    return next(new AppError('La identidad de desarrollo está deshabilitada.', 401));
  }

  const userId = req.header('x-dev-user-id') || env.DEV_USER_ID;

  if (!userId) {
    return next(new AppError('Falta la identidad de desarrollo.', 401));
  }

  req.user = { id: userId };
  next();
}
