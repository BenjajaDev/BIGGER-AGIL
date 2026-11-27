import { existsSync, mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import type { Logger } from './logger.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const BACKUP_NAME = /^bigger-\d{4}-\d{2}-\d{2}\.db$/;

/** `bigger-2026-11-27.db`: the calendar day in the shop's time zone, so it sorts by date. */
export function backupFileName(date: Date, timeZone: string): string {
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
  return `bigger-${day}.db`;
}

/** Deletes all but the `keep` newest backups; returns the names it deleted. */
export function pruneBackups(directory: string, keep: number): string[] {
  const stale = readdirSync(directory)
    .filter((name) => BACKUP_NAME.test(name))
    .sort()
    .reverse()
    .slice(keep);
  for (const name of stale) rmSync(join(directory, name), { force: true });
  return stale;
}

export interface BackupOptions {
  /** Where `bigger-YYYY-MM-DD.db` files go. */
  directory: string;
  keep: number;
  timeZone: string;
  logger: Logger;
  backup: (destination: string) => Promise<void>;
  now?: () => Date;
  intervalMs?: number;
}

export interface BackupScheduler {
  /** Makes today's backup unless it already exists; never throws. */
  runNow: () => Promise<void>;
  stop: () => void;
}

/** Backs up on startup (if today has none) and then every 24 h; a failure is logged, not fatal. */
export function startBackups(options: BackupOptions): BackupScheduler {
  const { directory, keep, timeZone, logger, backup, now = () => new Date() } = options;

  const backupToday = async (): Promise<void> => {
    try {
      mkdirSync(directory, { recursive: true });
      const file = backupFileName(now(), timeZone);
      const destination = join(directory, file);
      if (existsSync(destination)) return;
      // Written aside and renamed, so a crash never leaves a half file that looks like a backup.
      const partial = `${destination}.partial`;
      try {
        await backup(partial);
        renameSync(partial, destination);
      } catch (error) {
        rmSync(partial, { force: true });
        throw error;
      }
      const removed = pruneBackups(directory, keep);
      logger.info({ file: destination, removed: removed.length }, 'Respaldo diario creado');
    } catch (error) {
      logger.error({ err: error, directory }, 'No se pudo crear el respaldo diario');
    }
  };

  let running: Promise<void> | null = null;
  const runNow = (): Promise<void> => {
    running ??= backupToday().finally(() => {
      running = null;
    });
    return running;
  };

  void runNow();
  const timer = setInterval(() => {
    void runNow();
  }, options.intervalMs ?? DAY_MS);
  timer.unref();
  return {
    runNow,
    stop: () => {
      clearInterval(timer);
    },
  };
}
