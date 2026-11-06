import type { Env } from '../../config/env.js';
import { resolveTransport } from './printer-transport.js';
import { PathPrinter, type ReceiptPrinter } from './receipt-printer.js';
import { SerialPrinter } from './serial-printer.js';
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
  | 'PRINTER_TRANSPORT'
  | 'PRINTER_BAUD_RATE'
  | 'PRINTER_CODEPAGE'
  | 'PRINTER_COLUMNS'
  | 'PRINTER_FEED_LINES'
  | 'PRINTER_CUT'
  | 'BUSINESS_TIMEZONE'
>;

function buildPrinter(env: PrintingEnv): ReceiptPrinter | null {
  const path = env.PRINTER_PATH;
  if (!env.PRINTER_ENABLED || !path) return null;
  return resolveTransport(path, env.PRINTER_TRANSPORT) === 'serial'
    ? new SerialPrinter(path, { baudRate: env.PRINTER_BAUD_RATE })
    : new PathPrinter(path);
}

export function buildPrintingSetup(env: PrintingEnv): PrintingSetup {
  return {
    printer: buildPrinter(env),
    options: {
      codepage: env.PRINTER_CODEPAGE,
      columns: env.PRINTER_COLUMNS,
      feedLines: env.PRINTER_FEED_LINES,
      cut: env.PRINTER_CUT,
      timeZone: env.BUSINESS_TIMEZONE,
    },
  };
}
