import type { ApiErrorBody } from '@bigger/shared';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError } from '../errors/app-error.js';
import type { Logger } from '../logger.js';

function isBodyParseError(error: unknown): boolean {
  return error instanceof SyntaxError && 'type' in error && error.type === 'entity.parse.failed';
}

function toErrorBody(error: AppError): ApiErrorBody {
  return {
    error: {
      code: error.code,
      message: error.message,
      ...(error.issues ? { issues: [...error.issues] } : {}),
    },
  };
}

export function createErrorHandler(logger: Logger): ErrorRequestHandler {
  return (error: unknown, _req, res, _next) => {
    if (error instanceof AppError) {
      res.status(error.status).json(toErrorBody(error));
      return;
    }
    if (isBodyParseError(error)) {
      res
        .status(400)
        .json(
          toErrorBody(
            new AppError('VALIDATION_ERROR', 'El cuerpo de la solicitud no es JSON válido'),
          ),
        );
      return;
    }
    logger.error({ err: error }, 'Unhandled error');
    res
      .status(500)
      .json(toErrorBody(new AppError('INTERNAL_ERROR', 'Ocurrió un error inesperado')));
  };
}

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError('NOT_FOUND', `Ruta ${req.method} ${req.path} no encontrada`));
};
