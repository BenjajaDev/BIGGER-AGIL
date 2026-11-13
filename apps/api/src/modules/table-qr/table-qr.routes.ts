import { TableLabelSchema } from '@bigger/shared';
import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import { parseOrThrow } from '../../core/http/parse.js';
import { sendData } from '../../core/http/respond.js';
import type { TableQrService } from './table-qr.service.js';

const TokenParamsSchema = z.object({ token: z.string().regex(/^[\w-]{16,64}$/) });
const IdParamsSchema = z.object({ id: z.uuid() });

/** Public: scanning a QR only reveals the table's name, nothing else. */
export function createTableLabelRouter(service: TableQrService): Router {
  const router = Router();
  const handler: RequestHandler = async (req, res) => {
    const { token } = parseOrThrow(TokenParamsSchema, req.params);
    sendData(res, TableLabelSchema.parse({ label: await service.labelFor(token) }));
  };
  router.get('/menu/table/:token', handler);
  return router;
}

/** Mounted below `/admin`: only the administration can see and rotate the tokens. */
export function createTableQrAdminRouter(service: TableQrService): Router {
  const router = Router();
  router.get('/tables/qr', async (_req, res) => {
    sendData(res, await service.list());
  });
  router.post('/tables/:id/qr/regenerate', async (req, res) => {
    await service.regenerate(parseOrThrow(IdParamsSchema, req.params).id);
    sendData(res, await service.list());
  });
  return router;
}
