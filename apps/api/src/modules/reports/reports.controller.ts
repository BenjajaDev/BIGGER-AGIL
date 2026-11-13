import { CashCloseInputSchema, ReportKindSchema, ReportRangeSchema } from '@bigger/shared';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import { parseOrThrow } from '../../core/http/parse.js';
import { sendData } from '../../core/http/respond.js';
import type { ReportsService } from './reports.service.js';

const DateQuerySchema = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });
const ExportQuerySchema = z.object({ from: z.string(), to: z.string(), kind: ReportKindSchema });

export class ReportsController {
  readonly #service: ReportsService;

  constructor(service: ReportsService) {
    this.#service = service;
  }

  sales: RequestHandler = async (req, res) => {
    sendData(res, await this.#service.sales(parseOrThrow(ReportRangeSchema, req.query)));
  };

  export: RequestHandler = async (req, res) => {
    const { kind, ...range } = parseOrThrow(ExportQuerySchema, req.query);
    const { filename, csv } = await this.#service.export(
      parseOrThrow(ReportRangeSchema, range),
      kind,
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  };

  cashClose: RequestHandler = async (req, res) => {
    sendData(res, await this.#service.cashClose(parseOrThrow(DateQuerySchema, req.query).date));
  };

  closeCash: RequestHandler = async (req, res) => {
    sendData(res, await this.#service.closeCash(parseOrThrow(CashCloseInputSchema, req.body)), 201);
  };
}
