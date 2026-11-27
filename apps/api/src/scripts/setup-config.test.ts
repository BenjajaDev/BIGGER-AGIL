import { describe, expect, it } from 'vitest';
import {
  mergeConfig,
  parseConfig,
  parseSetupArgs,
  renderConfig,
  type ConfigValues,
} from './setup-config.js';

describe('parseSetupArgs', () => {
  it('reads every option, in both spellings', () => {
    const result = parseSetupArgs([
      '--config',
      'C:\\ProgramData\\BIGGER\\config.env',
      '--data-dir=C:\\ProgramData\\BIGGER',
      '--web-dir',
      'C:\\Program Files\\BIGGER Agil\\web',
      '--pin-file',
      'pin.txt',
      '--printer-path',
      'COM5',
      '--seed-catalog',
    ]);
    expect(result).toEqual({
      ok: true,
      args: {
        configPath: 'C:\\ProgramData\\BIGGER\\config.env',
        dataDir: 'C:\\ProgramData\\BIGGER',
        webDir: 'C:\\Program Files\\BIGGER Agil\\web',
        pinFile: 'pin.txt',
        printerPath: 'COM5',
        seedCatalog: true,
      },
    });
  });

  it('defaults the optional ones', () => {
    const result = parseSetupArgs(['--config', 'c', '--data-dir', 'd', '--web-dir', 'w']);
    expect(result).toMatchObject({
      ok: true,
      args: { pinFile: null, printerPath: null, seedCatalog: false },
    });
  });

  it.each([
    [['--config', 'c', '--data-dir', 'd'], /--web-dir/],
    [['--config', 'c', '--data-dir', 'd', '--web-dir'], /Falta el valor de --web-dir/],
    [['--config', 'c', '--data-dir', '--web-dir', 'w'], /Falta el valor de --data-dir/],
    [['--config', 'c', '--data-dir', 'd', '--web-dir', 'w', '--rapido'], /desconocida/],
  ])('rejects %j', (argv, message) => {
    const result = parseSetupArgs(argv);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(message);
  });
});

const FORCED: ConfigValues = {
  DATABASE_PATH: 'C:\\ProgramData\\BIGGER\\bigger.db',
  WEB_DIST_DIR: 'C:\\Program Files\\BIGGER Agil\\web',
  ADMIN_PIN_HASH: 'scrypt:16384:8:1:c2FsdA:aGFzaA',
  ADMIN_SESSION_SECRET: 'x'.repeat(64),
};

describe('mergeConfig / renderConfig', () => {
  it('starts a fresh install with the production defaults', () => {
    const config = mergeConfig(null, { forced: FORCED });
    expect(config).toMatchObject({
      NODE_ENV: 'production',
      HOST: '0.0.0.0',
      PORT: '3000',
      BACKUP_KEEP: '14',
      PRINTER_ENABLED: 'false',
      WEB_DIST_DIR: FORCED.WEB_DIST_DIR,
    });
  });

  it('keeps what the owner changed, but refreshes the folders', () => {
    const existing = parseConfig(
      'PORT=8080\nWEB_DIST_DIR=D:\\viejo\\web\nADMIN_PIN_HASH=scrypt:1:1:1:a:b\nMI_AJUSTE=1\n',
    );
    const { ADMIN_PIN_HASH: _hash, ADMIN_SESSION_SECRET: _secret, ...folders } = FORCED;
    const config = mergeConfig(existing, { forced: folders });
    expect(config.PORT).toBe('8080');
    expect(config.WEB_DIST_DIR).toBe(FORCED.WEB_DIST_DIR);
    expect(config.ADMIN_PIN_HASH).toBe('scrypt:1:1:1:a:b');
    expect(config.MI_AJUSTE).toBe('1');
  });

  it('writes LF only, Spanish comments, no quotes around Windows paths', () => {
    const text = renderConfig(mergeConfig(null, { forced: { ...FORCED, MI_AJUSTE: 'x' } }));
    expect(text).not.toContain('\r');
    expect(text).toContain('# Puerto del sistema');
    expect(text).toContain('WEB_DIST_DIR=C:\\Program Files\\BIGGER Agil\\web\n');
    expect(text.indexOf('# Otros ajustes')).toBeGreaterThan(text.indexOf('PRINTER_PATH='));
    expect(text.endsWith('MI_AJUSTE=x\n')).toBe(true);
  });

  it('round-trips through parseConfig, including values with #', () => {
    const config = mergeConfig(null, { forced: { ...FORCED, PRINTER_PATH: 'COM#5' } });
    expect(parseConfig(renderConfig(config))).toEqual(config);
  });
});
