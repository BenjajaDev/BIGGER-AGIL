import { describe, expect, it } from 'vitest';
import { readCookie } from './cookies.js';
import { LoginThrottle } from './login-throttle.js';
import { hashPin, PIN_HASH_PATTERN, verifyPin } from './pin-hash.js';
import { createSessionToken, verifySessionToken } from './session-token.js';

const SECRET = 'a'.repeat(32);

describe('pin hashing', () => {
  it('verifies the right PIN and rejects a wrong one', async () => {
    const hash = await hashPin('482915');
    expect(hash).toMatch(PIN_HASH_PATTERN);
    await expect(verifyPin('482915', hash)).resolves.toBe(true);
    await expect(verifyPin('482916', hash)).resolves.toBe(false);
  });

  it('salts every hash', async () => {
    expect(await hashPin('1234')).not.toBe(await hashPin('1234'));
  });

  it('rejects malformed stored hashes', async () => {
    await expect(verifyPin('1234', 'plain-text')).resolves.toBe(false);
  });
});

describe('session tokens', () => {
  const now = new Date('2026-10-21T12:00:00.000Z');

  it('accepts a valid token until it expires', () => {
    const { token, expiresAt } = createSessionToken(SECRET, now, 60_000);
    expect(verifySessionToken(token, SECRET, now)).toEqual(expiresAt);
    expect(verifySessionToken(token, SECRET, new Date(now.getTime() + 60_000))).toBeNull();
  });

  it('rejects tampered tokens and tokens signed with another secret', () => {
    const { token } = createSessionToken(SECRET, now);
    const [, nonce, signature] = token.split('.');
    const extended = `${now.getTime() + 999_999_999}.${nonce ?? ''}.${signature ?? ''}`;
    expect(verifySessionToken(extended, SECRET, now)).toBeNull();
    expect(verifySessionToken(token, 'b'.repeat(32), now)).toBeNull();
    expect(verifySessionToken('garbage', SECRET, now)).toBeNull();
  });
});

describe('LoginThrottle', () => {
  it('blocks after the maximum failures and unblocks when the window ends', () => {
    const throttle = new LoginThrottle({ maxFailures: 2, windowMs: 1000 });
    throttle.registerFailure('ip', 0);
    expect(throttle.retryAfterMs('ip', 10)).toBe(0);
    throttle.registerFailure('ip', 20);
    expect(throttle.retryAfterMs('ip', 100)).toBe(900);
    expect(throttle.retryAfterMs('ip', 1000)).toBe(0);
  });

  it('isolates clients and resets after a success', () => {
    const throttle = new LoginThrottle({ maxFailures: 1, windowMs: 1000 });
    throttle.registerFailure('a', 0);
    expect(throttle.retryAfterMs('b', 0)).toBe(0);
    throttle.reset('a');
    expect(throttle.retryAfterMs('a', 0)).toBe(0);
  });
});

describe('readCookie', () => {
  it('finds a cookie among others and decodes it', () => {
    expect(readCookie('theme=dark; bigger_admin=abc%2E1; x=y', 'bigger_admin')).toBe('abc.1');
    expect(readCookie('theme=dark', 'bigger_admin')).toBeNull();
    expect(readCookie(undefined, 'bigger_admin')).toBeNull();
  });
});
