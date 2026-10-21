import { AdminLoginInputSchema } from '@bigger/shared';
import { randomBytes } from 'node:crypto';
import { createInterface } from 'node:readline';
import { hashPin } from '../modules/admin-auth/pin-hash.js';

/** Interactive on purpose: a PIN passed as an argument would stay in the shell history. */
const reader = createInterface({ input: process.stdin, terminal: false });
// The async iterator buffers lines, so it works both typed and piped (`printf … | pnpm admin:pin`).
const lines = reader[Symbol.asyncIterator]();

async function ask(question: string): Promise<string> {
  process.stdout.write(question);
  const next = await lines.next();
  if (next.done) throw new Error('La entrada terminó antes de ingresar el PIN');
  return next.value.trim();
}

try {
  const pin = await ask('Nuevo PIN de administración (4 a 12 dígitos): ');
  const confirmation = await ask('Repite el PIN: ');

  const parsed = AdminLoginInputSchema.safeParse({ pin });
  if (!parsed.success) {
    process.stderr.write(`\n${parsed.error.issues[0]?.message ?? 'PIN inválido'}\n`);
    process.exitCode = 1;
  } else if (pin !== confirmation) {
    process.stderr.write('\nLos PIN no coinciden\n');
    process.exitCode = 1;
  } else {
    process.stdout.write(
      [
        '',
        '',
        'Copia estas líneas en apps/api/.env (nunca las subas al repositorio):',
        `ADMIN_PIN_HASH=${await hashPin(parsed.data.pin)}`,
        `ADMIN_SESSION_SECRET=${randomBytes(48).toString('base64url')}`,
        '',
      ].join('\n'),
    );
  }
} finally {
  reader.close();
}
