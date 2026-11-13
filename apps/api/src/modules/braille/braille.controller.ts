import type { RequestHandler } from 'express';
import { z } from 'zod';
import { parseOrThrow } from '../../core/http/parse.js';
import { sendData } from '../../core/http/respond.js';
import type { BrailleService } from './braille.service.js';

const PlateParamsSchema = z.object({ plateId: z.string().regex(/^[a-z0-9-]+$/) });

export class BrailleController {
  readonly #service: BrailleService;

  constructor(service: BrailleService) {
    this.#service = service;
  }

  list: RequestHandler = async (_req, res) => {
    sendData(res, await this.#service.plates());
  };

  download: RequestHandler = async (req, res) => {
    const { plateId } = parseOrThrow(PlateParamsSchema, req.params);
    const { filename, data } = await this.#service.stl(plateId);
    res.setHeader('Content-Type', 'model/stl');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(data);
  };
}
