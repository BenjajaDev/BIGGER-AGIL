import { Router } from 'express';
import { sendData } from '../../core/http/respond.js';

export function createHealthRouter(): Router {
  const router = Router();
  router.get('/health', (_req, res) => {
    sendData(res, { status: 'ok' });
  });
  return router;
}
