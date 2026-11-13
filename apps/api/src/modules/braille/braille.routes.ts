import { Router } from 'express';
import type { BrailleController } from './braille.controller.js';

/** Mounted below `/admin`, so it inherits the admin session guard. */
export function createBrailleRouter(controller: BrailleController): Router {
  const router = Router();
  router.get('/braille/plates', controller.list);
  router.get('/braille/plates/:plateId/stl', controller.download);
  return router;
}
