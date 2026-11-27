import { AdminLoginInputSchema } from '@bigger/shared';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { parseEnv } from '../config/env.js';
import { openDatabase, runMigrations } from '../db/client.js';
import { seedDatabase } from '../db/seed/seed.js';
import { hashPin } from '../modules/admin-auth/pin-hash.js';
import {
  mergeConfig,
  parseConfig,
  parseSetupArgs,
  renderConfig,
  SETUP_USAGE,
  type ConfigValues,
  type SetupArgs,
} from './setup-config.js';

/**
 * Prepares an installation: config file, data folders, migrated database and, optionally, the
 * real catalog. Run by the Windows installer on first install and on every update. It never prints
 * the PIN, and it deletes the file the PIN came from, whatever the outcome.
 */

function say(message: string): void {
  process.stdout.write(`${message}\n`);
}

class SetupError extends Error {}

function readPin(pinFile: string): string {
  let text: string;
  try {
    text = readFileSync(pinFile, 'utf8');
  } catch {
    throw new SetupError('No se pudo leer el archivo con el PIN');
  }
  const firstLine = text.replace(/^\uFEFF/, '').split(/\r?\n/)[0] ?? '';
  const parsed = AdminLoginInputSchema.safeParse({ pin: firstLine.trim() });
  if (!parsed.success) {
    throw new SetupError(
      `El PIN no es válido: ${parsed.error.issues[0]?.message ?? 'usa de 4 a 12 dígitos'}`,
    );
  }
  return parsed.data.pin;
}

async function run(args: SetupArgs): Promise<void> {
  const configPath = resolve(args.configPath);
  const dataDir = resolve(args.dataDir);
  const existing = existsSync(configPath) ? parseConfig(readFileSync(configPath, 'utf8')) : null;

  const forced: ConfigValues = {
    DATABASE_PATH: join(dataDir, 'bigger.db'),
    UPLOADS_DIR: join(dataDir, 'uploads'),
    BACKUP_DIR: join(dataDir, 'respaldos'),
    WEB_DIST_DIR: resolve(args.webDir),
  };
  if (args.printerPath !== null) {
    forced.PRINTER_ENABLED = 'true';
    forced.PRINTER_PATH = args.printerPath;
  }
  if (args.pinFile !== null) {
    forced.ADMIN_PIN_HASH = await hashPin(readPin(args.pinFile));
    forced.ADMIN_SESSION_SECRET = randomBytes(48).toString('base64url');
  }

  const config = mergeConfig(existing, { forced });
  if (config.ADMIN_PIN_HASH === undefined || config.ADMIN_SESSION_SECRET === undefined) {
    throw new SetupError('Primera instalación: falta el PIN del encargado (--pin-file)');
  }
  // The same validation the server runs on start, so a bad config fails here and not at boot.
  try {
    parseEnv(config);
  } catch (error) {
    throw new SetupError(error instanceof Error ? error.message : 'Configuración inválida');
  }

  for (const folder of [dirname(configPath), dataDir, forced.UPLOADS_DIR, forced.BACKUP_DIR]) {
    if (folder) mkdirSync(folder, { recursive: true });
  }
  const temporary = `${configPath}.nuevo`;
  writeFileSync(temporary, renderConfig(config), { encoding: 'utf8', mode: 0o600 });
  renameSync(temporary, configPath);
  say(existing === null ? 'Configuración creada.' : 'Configuración actualizada.');

  const connection = openDatabase(config.DATABASE_PATH ?? forced.DATABASE_PATH ?? '');
  try {
    runMigrations(connection.db);
    say('Base de datos lista.');
    if (args.seedCatalog) {
      const result = seedDatabase(connection.db, { withDemoOrders: false, withHistory: false });
      say(
        result === 'seeded'
          ? 'Catálogo de BIGGER cargado.'
          : 'La base ya tenía datos: no se cargó el catálogo.',
      );
    }
  } finally {
    connection.close();
  }
}

const parsed = parseSetupArgs(process.argv.slice(2));
if (!parsed.ok) {
  process.stderr.write(`${parsed.error}\n${SETUP_USAGE}\n`);
  process.exitCode = 2;
} else {
  try {
    await run(parsed.args);
    say('Listo.');
  } catch (error) {
    process.stderr.write(
      `${error instanceof SetupError ? error.message : `No se pudo completar la configuración: ${String(error)}`}\n`,
    );
    process.exitCode = 1;
  } finally {
    if (parsed.args.pinFile !== null) rmSync(parsed.args.pinFile, { force: true });
  }
}
