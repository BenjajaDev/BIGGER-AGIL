interface AttemptWindow {
  failures: number;
  windowStartedAt: number;
}

export interface LoginThrottleOptions {
  maxFailures: number;
  windowMs: number;
}

/** In-memory brute-force guard per client: a short PIN is only safe with limited attempts. */
export class LoginThrottle {
  readonly #attempts = new Map<string, AttemptWindow>();
  readonly #options: LoginThrottleOptions;

  constructor(options: LoginThrottleOptions = { maxFailures: 5, windowMs: 15 * 60 * 1000 }) {
    this.#options = options;
  }

  /** Milliseconds until the client may try again, or 0 when it is not blocked. */
  retryAfterMs(clientKey: string, now: number): number {
    const window = this.#currentWindow(clientKey, now);
    if (!window || window.failures < this.#options.maxFailures) return 0;
    return window.windowStartedAt + this.#options.windowMs - now;
  }

  registerFailure(clientKey: string, now: number): void {
    const window = this.#currentWindow(clientKey, now) ?? { failures: 0, windowStartedAt: now };
    window.failures += 1;
    this.#attempts.set(clientKey, window);
  }

  reset(clientKey: string): void {
    this.#attempts.delete(clientKey);
  }

  #currentWindow(clientKey: string, now: number): AttemptWindow | undefined {
    const window = this.#attempts.get(clientKey);
    if (window && now - window.windowStartedAt >= this.#options.windowMs) {
      this.#attempts.delete(clientKey);
      return undefined;
    }
    return window;
  }
}
