import { describe, expect, it } from 'vitest';
import { parseEnv, resolveEnvFile } from './env.js';

const ADMIN = {
  ADMIN_PIN_HASH: 'scrypt:16384:8:1:c2FsdA:aGFzaA',
  ADMIN_SESSION_SECRET: 's'.repeat(32),
};

describe('parseEnv', () => {
  it('applies safe defaults', () => {
    expect(parseEnv(ADMIN)).toEqual({
      NODE_ENV: 'development',
      HOST: '127.0.0.1',
      PORT: 3000,
      DATABASE_PATH: './data/bigger.db',
      CORS_ORIGINS: ['http://localhost:5173'],
      LOG_LEVEL: 'info',
      UPLOADS_DIR: './data/uploads',
      BUSINESS_TIMEZONE: 'America/Santiago',
      BACKUP_KEEP: 14,
      PRINTER_ENABLED: false,
      PRINTER_TRANSPORT: 'auto',
      PRINTER_BAUD_RATE: 9600,
      PRINTER_CODEPAGE: 'cp858',
      PRINTER_COLUMNS: 32,
      PRINTER_FEED_LINES: 4,
      PRINTER_CUT: false,
      ...ADMIN,
    });
  });

  it('needs the device path before the printer can be turned on', () => {
    expect(() => parseEnv({ ...ADMIN, PRINTER_ENABLED: 'true' })).toThrow(/PRINTER_PATH/);
    const env = parseEnv({
      ...ADMIN,
      PRINTER_ENABLED: 'true',
      PRINTER_PATH: 'COM5',
      PRINTER_CODEPAGE: 'wpc1252',
    });
    expect(env).toMatchObject({
      PRINTER_ENABLED: true,
      PRINTER_PATH: 'COM5',
      PRINTER_CODEPAGE: 'wpc1252',
    });
  });

  it.each([
    [{ PRINTER_CODEPAGE: 'utf8' }],
    [{ PRINTER_TRANSPORT: 'usb' }],
    [{ PRINTER_BAUD_RATE: '100' }],
    [{ PRINTER_COLUMNS: '8' }],
    [{ PRINTER_COLUMNS: '200' }],
    [{ PRINTER_FEED_LINES: '-1' }],
    [{ PRINTER_ENABLED: 'quizás' }],
  ])('rejects an invalid printer setting %j', (printer) => {
    expect(() => parseEnv({ ...ADMIN, ...printer })).toThrow();
  });

  it('splits and validates CORS origins', () => {
    const env = parseEnv({
      ...ADMIN,
      CORS_ORIGINS: 'http://localhost:5173, http://192.168.1.20:5173',
    });
    expect(env.CORS_ORIGINS).toEqual(['http://localhost:5173', 'http://192.168.1.20:5173']);
  });

  it('reads the production folders and treats blank values as not set', () => {
    const env = parseEnv({
      ...ADMIN,
      WEB_DIST_DIR: '/app/web',
      BACKUP_DIR: '/data/respaldos',
      BACKUP_KEEP: '7',
    });
    expect(env).toMatchObject({ WEB_DIST_DIR: '/app/web', BACKUP_DIR: '/data/respaldos' });
    expect(env.BACKUP_KEEP).toBe(7);

    const blank = parseEnv({ ...ADMIN, WEB_DIST_DIR: '', BACKUP_DIR: '', BACKUP_KEEP: '' });
    expect(blank.WEB_DIST_DIR).toBeUndefined();
    expect(blank.BACKUP_DIR).toBeUndefined();
    expect(blank.BACKUP_KEEP).toBe(14);
  });

  it('prefers BIGGER_CONFIG when that file exists', () => {
    expect(resolveEnvFile({})).toBe('.env');
    expect(resolveEnvFile({ BIGGER_CONFIG: '/no/existe/config.env' })).toBe('.env');
    expect(resolveEnvFile({ BIGGER_CONFIG: import.meta.filename })).toBe(import.meta.filename);
  });

  it.each([
    [{ ...ADMIN, BACKUP_KEEP: '0' }],
    [{ ...ADMIN, BACKUP_KEEP: '400' }],
    [{ ...ADMIN, PORT: 'abc' }],
    [{ ...ADMIN, PORT: '70000' }],
    [{ ...ADMIN, CORS_ORIGINS: 'not-a-url' }],
    [{ ...ADMIN, NODE_ENV: 'staging' }],
    [{ ADMIN_SESSION_SECRET: ADMIN.ADMIN_SESSION_SECRET }],
    [{ ...ADMIN, ADMIN_PIN_HASH: '123456' }],
    [{ ...ADMIN, ADMIN_SESSION_SECRET: 'short' }],
    [{ ...ADMIN, BUSINESS_TIMEZONE: 'Marte/Olympus' }],
  ])('rejects invalid values %o', (source) => {
    expect(() => parseEnv(source)).toThrow(/Variables de entorno inválidas/);
  });
});
