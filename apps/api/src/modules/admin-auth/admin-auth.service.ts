import { AppError } from '../../core/errors/app-error.js';
import type { LoginThrottle } from './login-throttle.js';
import { verifyPin } from './pin-hash.js';
import { createSessionToken, verifySessionToken, type SessionToken } from './session-token.js';

export interface AdminAuthConfig {
  pinHash: string;
  sessionSecret: string;
}

export class AdminAuthService {
  readonly #config: AdminAuthConfig;
  readonly #throttle: LoginThrottle;
  readonly #now: () => Date;

  constructor(
    config: AdminAuthConfig,
    throttle: LoginThrottle,
    now: () => Date = () => new Date(),
  ) {
    this.#config = config;
    this.#throttle = throttle;
    this.#now = now;
  }

  async login(pin: string, clientKey: string): Promise<SessionToken> {
    const now = this.#now();
    const retryAfterMs = this.#throttle.retryAfterMs(clientKey, now.getTime());
    if (retryAfterMs > 0) {
      const minutes = Math.ceil(retryAfterMs / 60_000);
      throw new AppError(
        'TOO_MANY_REQUESTS',
        `Demasiados intentos. Vuelve a intentarlo en ${minutes} min.`,
      );
    }

    if (!(await verifyPin(pin, this.#config.pinHash))) {
      this.#throttle.registerFailure(clientKey, now.getTime());
      throw new AppError('UNAUTHORIZED', 'PIN incorrecto');
    }

    this.#throttle.reset(clientKey);
    return createSessionToken(this.#config.sessionSecret, now);
  }

  verify(token: string | null): Date | null {
    return token ? verifySessionToken(token, this.#config.sessionSecret, this.#now()) : null;
  }
}
