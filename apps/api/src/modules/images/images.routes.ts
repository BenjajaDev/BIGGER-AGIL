import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES } from '@bigger/shared';
import express, { Router } from 'express';
import { sendData } from '../../core/http/respond.js';
import type { ImagesService } from './images.service.js';

/** Raw body upload (`Content-Type: image/jpeg|png|webp`): no multipart parser needed. */
export function createImagesRouter(service: ImagesService): Router {
  const router = Router();
  router.post(
    '/images',
    express.raw({ type: [...ACCEPTED_IMAGE_TYPES], limit: MAX_IMAGE_BYTES }),
    async (req, res) => {
      const body: unknown = req.body;
      sendData(res, await service.upload(Buffer.isBuffer(body) ? body : Buffer.alloc(0)), 201);
    },
  );
  return router;
}
