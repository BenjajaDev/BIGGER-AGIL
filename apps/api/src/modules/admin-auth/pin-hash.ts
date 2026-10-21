import {
  randomBytes,
  scrypt,
  timingSafeEqual,
  type BinaryLike,
  type ScryptOptions,
} from 'node:crypto';

const KEY_LENGTH = 32;
const SALT_BYTES = 16;
const DEFAULT_PARAMS = { N: 16_384, r: 8, p: 1 } as const;

/**
 * `scrypt:N:r:p:salt:hash` (base64url). Parameters travel with the hash so they can be raised later.
 * `:` instead of the usual `$` keeps shells and Docker Compose from interpolating the value.
 */
export const PIN_HASH_PATTERN = /^scrypt:\d+:\d+:\d+:[\w-]+:[\w-]+$/;

function deriveKey(pin: BinaryLike, salt: Buffer, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(pin, salt, KEY_LENGTH, options, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await deriveKey(pin, salt, DEFAULT_PARAMS);
  const { N, r, p } = DEFAULT_PARAMS;
  return ['scrypt', N, r, p, salt.toString('base64url'), key.toString('base64url')].join(':');
}

export async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
  if (!PIN_HASH_PATTERN.test(storedHash)) return false;
  const [, n, r, p, salt, expected] = storedHash.split(':');
  if (!n || !r || !p || !salt || !expected) return false;

  const expectedKey = Buffer.from(expected, 'base64url');
  const actualKey = await deriveKey(pin, Buffer.from(salt, 'base64url'), {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });
  return expectedKey.length === actualKey.length && timingSafeEqual(expectedKey, actualKey);
}
