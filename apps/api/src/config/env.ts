import { existsSync } from 'node:fs';
import { z } from 'zod';
import { PIN_HASH_PATTERN } from '../modules/admin-auth/pin-hash.js';
import { PRINTER_CODEPAGES } from '../modules/printing/escpos-encoder.js';
import { PRINTER_TRANSPORTS } from '../modules/printing/printer-transport.js';

function isTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('es-CL', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** Blank values in a config file (`KEY=`) count as not set. */
function optionalText() {
  return z.preprocess((value) => (value === '' ? undefined : value), z.string().min(1).optional());
}

const EnvObjectSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().min(1).default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  DATABASE_PATH: z.string().min(1).default('./data/bigger.db'),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:5173')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.url()).min(1)),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  /** Where processed product and category pictures are stored. */
  UPLOADS_DIR: z.string().min(1).default('./data/uploads'),
  /** The shop's time zone: decides on which calendar day a promotion starts and ends. */
  BUSINESS_TIMEZONE: z
    .string()
    .default('America/Santiago')
    .refine(isTimeZone, 'Zona horaria IANA inválida (ej.: America/Santiago)'),
  ADMIN_PIN_HASH: z
    .string()
    .regex(PIN_HASH_PATTERN, 'Genera el valor con: pnpm --filter @bigger/api admin:pin'),
  ADMIN_SESSION_SECRET: z
    .string()
    .min(32, 'Usa al menos 32 caracteres aleatorios (pnpm --filter @bigger/api admin:pin)'),
  /** Compiled web app (index.html and assets). When set, the API serves it too: one server for everything. */
  WEB_DIST_DIR: optionalText(),
  /** Daily SQLite backups go here. Off when not set. */
  BACKUP_DIR: optionalText(),
  /** How many daily backups to keep. */
  BACKUP_KEEP: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.coerce.number().int().min(1).max(365).default(14),
  ),
  /** Prints each new order's comanda on the thermal printer. Off unless the shop turns it on. */
  PRINTER_ENABLED: z.stringbool().default(false),
  /** Bluetooth (COM5, /dev/rfcomm0) or USB (/dev/usb/lp0, \\\\localhost\\NOMBRE) device path. */
  PRINTER_PATH: optionalText(),
  /** `auto` uses the serial port for COMn and /dev/rfcomm*, /dev/ttyUSB*, and a plain write otherwise. */
  PRINTER_TRANSPORT: z.enum(PRINTER_TRANSPORTS).default('auto'),
  /** Only used by the serial port; Bluetooth ignores it and USB-serial printers use 9600 or 19200. */
  PRINTER_BAUD_RATE: z.coerce.number().int().min(1200).max(460_800).default(9600),
  PRINTER_CODEPAGE: z.enum(PRINTER_CODEPAGES).default('cp858'),
  /** 32 columns for 58 mm paper with the standard font. */
  PRINTER_COLUMNS: z.coerce.number().int().min(16).max(64).default(32),
  PRINTER_FEED_LINES: z.coerce.number().int().min(0).max(12).default(4),
  PRINTER_CUT: z.stringbool().default(false),
});

const EnvSchema = EnvObjectSchema.refine(
  (env) => !env.PRINTER_ENABLED || env.PRINTER_PATH !== undefined,
  {
    path: ['PRINTER_PATH'],
    message:
      'Indica el dispositivo de la impresora (ej.: COM5 o /dev/usb/lp0) o desactiva PRINTER_ENABLED',
  },
);

export type Env = z.infer<typeof EnvSchema>;

export function parseEnv(source: NodeJS.ProcessEnv): Env {
  const result = EnvSchema.safeParse(source);
  if (!result.success) {
    throw new Error(`Variables de entorno inválidas:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

/** `BIGGER_CONFIG` (the installed system's config file) wins over the `.env` of a development checkout. */
export function resolveEnvFile(source: NodeJS.ProcessEnv = process.env): string {
  const configured = source.BIGGER_CONFIG;
  return configured !== undefined && configured !== '' && existsSync(configured)
    ? configured
    : '.env';
}

export function loadEnv(envFilePath = resolveEnvFile()): Env {
  if (existsSync(envFilePath)) {
    process.loadEnvFile(envFilePath);
  }
  return parseEnv(process.env);
}
