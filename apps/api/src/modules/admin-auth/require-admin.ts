import type { RequestHandler } from 'express';
import { AppError } from '../../core/errors/app-error.js';
import { readAdminToken } from './admin-auth.controller.js';
import type { AdminAuthService } from './admin-auth.service.js';

export function requireAdmin(service: AdminAuthService): RequestHandler {
  return (req, _res, next) => {
    if (service.verify(readAdminToken(req)) === null) {
      next(new AppError('UNAUTHORIZED', 'Ingresa el PIN de administración para continuar'));
      return;
    }
    next();
  };
}
