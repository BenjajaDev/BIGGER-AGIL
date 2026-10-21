import { Router } from 'express';
import type { AdminAuthController } from './admin-auth.controller.js';

export function createAdminAuthRouter(controller: AdminAuthController): Router {
  const router = Router();
  router.post('/admin/session', controller.login);
  router.get('/admin/session', controller.getSession);
  router.delete('/admin/session', controller.logout);
  return router;
}
