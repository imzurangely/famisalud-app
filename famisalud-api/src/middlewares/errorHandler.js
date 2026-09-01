import { ZodError } from 'zod';

export function errorHandler(error, req, res, next) {
  console.error(error);

  if (error instanceof ZodError) {
    return res.status(422).json({
      success: false,
      message: 'Los datos enviados no son válidos.',
      errors: error.issues
    });
  }

  if (error.code === '23505') {
    return res.status(409).json({
      success: false,
      message: 'Ya existe un registro con esos datos.'
    });
  }

  if (error.code === '23503') {
    return res.status(409).json({
      success: false,
      message: 'No se puede realizar la operación porque existen relaciones asociadas.'
    });
  }

  if (error.code === '23514') {
    return res.status(422).json({
      success: false,
      message: 'Los datos enviados no cumplen las reglas de integridad de la base de datos.'
    });
  }

  if (error.statusCode) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      ...(error.details ? { errors: error.details } : {})
    });
  }

  return res.status(500).json({
    success: false,
    message: 'Ocurrió un error interno en el servidor.'
  });
}
