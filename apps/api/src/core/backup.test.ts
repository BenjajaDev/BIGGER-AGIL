import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openDatabase } from '../db/client.js';
import { backupFileName, pruneBackups, startBackups } from './backup.js';
import { createLogger } from './logger.js';

let directory: string;
beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'bigger-backup-'));
});
afterEach(() => {
  rmSync(directory, { recursive: true, force: true });
});

describe('backupFileName', () => {
  it('uses the calendar day of the shop, not of UTC', () => {
    const lateNight = new Date('2026-11-28T02:30:00Z'); // 23:30 on the 27th in Santiago
    expect(backupFileName(lateNight, 'America/Santiago')).toBe('bigger-2026-11-27.db');
    expect(backupFileName(lateNight, 'UTC')).toBe('bigger-2026-11-28.db');
  });
});

describe('pruneBackups', () => {
  it('keeps the newest files and leaves unrelated ones alone', () => {
    for (const day of ['01', '02', '03', '04'])
      writeFileSync(join(directory, `bigger-2026-11-${day}.db`), 'x');
    writeFileSync(join(directory, 'notas.txt'), 'x');
    expect(pruneBackups(directory, 2)).toEqual(['bigger-2026-11-02.db', 'bigger-2026-11-01.db']);
    expect(readdirSync(directory).sort()).toEqual([
      'bigger-2026-11-03.db',
      'bigger-2026-11-04.db',
      'notas.txt',
    ]);
  });
});

describe('startBackups', () => {
  const logger = createLogger('silent');

  it('writes one backup per day, prunes and survives failures', async () => {
    let day = 25;
    const calls: string[] = [];
    const scheduler = startBackups({
      directory,
      keep: 2,
      timeZone: 'UTC',
      logger,
      now: () => new Date(Date.UTC(2026, 10, day, 12)),
      backup: (destination) => {
        calls.push(destination);
        writeFileSync(destination, 'db');
        return Promise.resolve();
      },
    });
    await scheduler.runNow();
    await scheduler.runNow(); // same day: nothing new
    day = 26;
    await scheduler.runNow();
    day = 27;
    await scheduler.runNow();
    expect(readdirSync(directory).sort()).toEqual(['bigger-2026-11-26.db', 'bigger-2026-11-27.db']);
    expect(calls.length).toBe(3);

    day = 28;
    const failing = startBackups({
      directory,
      keep: 2,
      timeZone: 'UTC',
      logger,
      now: () => new Date(Date.UTC(2026, 10, day, 12)),
      backup: (destination) => {
        writeFileSync(destination, 'partial');
        return Promise.reject(new Error('disco lleno'));
      },
    });
    await expect(failing.runNow()).resolves.toBeUndefined();
    expect(existsSync(join(directory, 'bigger-2026-11-28.db'))).toBe(false);
    expect(readdirSync(directory).some((name) => name.endsWith('.partial'))).toBe(false);
    scheduler.stop();
    failing.stop();
  });

  it('makes a real, readable copy of the database', async () => {
    const connection = openDatabase(join(directory, 'live.db'));
    const scheduler = startBackups({
      directory: join(directory, 'respaldos'),
      keep: 3,
      timeZone: 'UTC',
      logger,
      now: () => new Date('2026-11-27T12:00:00Z'),
      backup: connection.backup,
    });
    await scheduler.runNow();
    scheduler.stop();
    connection.close();
    const copy = openDatabase(join(directory, 'respaldos', 'bigger-2026-11-27.db'));
    copy.close();
    expect(readdirSync(join(directory, 'respaldos'))).toEqual(['bigger-2026-11-27.db']);
  });
});
