import { fileURLToPath } from 'node:url';

/** Resolved relative to this module so it works from `src/` (tsx) and from the `dist/` bundle. */
export const MIGRATIONS_DIR = fileURLToPath(new URL('../drizzle', import.meta.url));
