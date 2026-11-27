import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Resolved relative to this module so it works from `src/` (tsx) and from the `dist/` bundle. */
export const MIGRATIONS_DIR = fileURLToPath(new URL('../drizzle', import.meta.url));

const PACKAGE_JSON = fileURLToPath(new URL('../package.json', import.meta.url));

/** The API's own version, read from its package.json (next to `src/` and `dist/`). */
export function readApiVersion(): string {
  try {
    const parsed: unknown = JSON.parse(readFileSync(PACKAGE_JSON, 'utf8'));
    if (typeof parsed === 'object' && parsed !== null && 'version' in parsed) {
      return typeof parsed.version === 'string' ? parsed.version : '0.0.0';
    }
  } catch {
    // Falls through: a missing package.json must not stop the server.
  }
  return '0.0.0';
}
