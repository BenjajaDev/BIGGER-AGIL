import { existsSync } from 'node:fs';
import { z } from 'zod';
import { PIN_HASH_PATTERN } from '../modules/admin-auth/pin-hash.js';

const EnvSchema = z.object({
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
  ADMIN_PIN_HASH: z
    .string()
    .regex(PIN_HASH_PATTERN, 'Genera el valor con: pnpm --filter @bigger/api admin:pin'),
  ADMIN_SESSION_SECRET: z
    .string()
    .min(32, 'Usa al menos 32 caracteres aleatorios (pnpm --filter @bigger/api admin:pin)'),
});

export type Env = z.infer<typeof EnvSchema>;

export function parseEnv(source: NodeJS.ProcessEnv): Env {
  const result = EnvSchema.safeParse(source);
  if (!result.success) {
    throw new Error(`Variables de entorno inválidas:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

export function loadEnv(envFilePath = '.env'): Env {
  if (existsSync(envFilePath)) {
    process.loadEnvFile(envFilePath);
  }
  return parseEnv(process.env);
}
