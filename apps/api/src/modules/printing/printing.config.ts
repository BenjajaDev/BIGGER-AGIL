import type { Env } from '../../config/env.js';
import { PathPrinter, type ReceiptPrinter } from './receipt-printer.js';
import type { PrintingOptions } from './print.service.js';

export interface PrintingSetup {
  /** `null` while printing is turned off. */
  printer: ReceiptPrinter | null;
  options: PrintingOptions;
}

export type PrintingEnv = Pick<
  Env,
  | 'PRINTER_ENABLED'
  | 'PRINTER_PATH'
  | 'PRINTER_CODEPAGE'
  | 'PRINTER_COLUMNS'
  | 'PRINTER_FEED_LINES'
  | 'PRINTER_CUT'
  | 'BUSINESS_TIMEZONE'
>;

export function buildPrintingSetup(env: PrintingEnv): PrintingSetup {
  return {
    printer: env.PRINTER_ENABLED && env.PRINTER_PATH ? new PathPrinter(env.PRINTER_PATH) : null,
    options: {
      codepage: env.PRINTER_CODEPAGE,
      columns: env.PRINTER_COLUMNS,
      feedLines: env.PRINTER_FEED_LINES,
      cut: env.PRINTER_CUT,
      timeZone: env.BUSINESS_TIMEZONE,
    },
  };
}
