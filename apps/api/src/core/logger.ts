import { pino, type Logger } from 'pino';
import type { Env } from '../config/env.js';

export type { Logger };

export function createLogger(level: Env['LOG_LEVEL']): Logger {
  return pino({ level, base: { service: 'bigger-api' } });
}
