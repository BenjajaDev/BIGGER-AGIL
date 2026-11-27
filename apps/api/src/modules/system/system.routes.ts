import { SystemInfoSchema } from '@bigger/shared';
import { Router } from 'express';
import { sendData } from '../../core/http/respond.js';
import type { SystemService } from './system.service.js';

/** Mounted below `/admin`. */
export function createSystemAdminRouter(service: SystemService): Router {
  const router = Router();
  router.get('/system/info', (_req, res) => {
    sendData(res, SystemInfoSchema.parse(service.info()));
  });
  return router;
}
