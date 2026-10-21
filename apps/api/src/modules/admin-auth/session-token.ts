import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export interface SessionToken {
  token: string;
  expiresAt: Date;
}

/** Stateless signed token `expiresAtMs.nonce.signature`; rotating the secret revokes every session. */
export function createSessionToken(
  secret: string,
  now: Date,
  ttlMs = SESSION_TTL_MS,
): SessionToken {
  const expiresAt = new Date(now.getTime() + ttlMs);
  const payload = `${expiresAt.getTime()}.${randomBytes(12).toString('base64url')}`;
  return { token: `${payload}.${sign(payload, secret)}`, expiresAt };
}

export function verifySessionToken(token: string, secret: string, now: Date): Date | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [expiresAtMs, nonce, signature] = parts;
  if (!expiresAtMs || !nonce || !signature || !/^\d+$/.test(expiresAtMs)) return null;

  const expected = Buffer.from(sign(`${expiresAtMs}.${nonce}`, secret));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  const expiresAt = new Date(Number(expiresAtMs));
  return expiresAt > now ? expiresAt : null;
}
