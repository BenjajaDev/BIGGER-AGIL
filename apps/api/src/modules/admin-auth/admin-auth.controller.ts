import { AdminLoginInputSchema, type AdminSession } from '@bigger/shared';
import type { CookieOptions, Request, RequestHandler } from 'express';
import { parseOrThrow } from '../../core/http/parse.js';
import { sendData } from '../../core/http/respond.js';
import type { AdminAuthService } from './admin-auth.service.js';
import { readCookie } from './cookies.js';

export const ADMIN_COOKIE_NAME = 'bigger_admin';
export const ADMIN_COOKIE_PATH = '/api/v1/admin';

function cookieOptions(req: Request): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure: req.secure,
    path: ADMIN_COOKIE_PATH,
  };
}

export function readAdminToken(req: Request): string | null {
  return readCookie(req.headers.cookie, ADMIN_COOKIE_NAME);
}

export class AdminAuthController {
  readonly #service: AdminAuthService;

  constructor(service: AdminAuthService) {
    this.#service = service;
  }

  login: RequestHandler = async (req, res) => {
    const { pin } = parseOrThrow(AdminLoginInputSchema, req.body);
    const session = await this.#service.login(pin, req.ip ?? 'unknown');
    res.cookie(ADMIN_COOKIE_NAME, session.token, {
      ...cookieOptions(req),
      expires: session.expiresAt,
    });
    const body: AdminSession = { authenticated: true, expiresAt: session.expiresAt.toISOString() };
    sendData(res, body);
  };

  getSession: RequestHandler = (req, res) => {
    const expiresAt = this.#service.verify(readAdminToken(req));
    const body: AdminSession = {
      authenticated: expiresAt !== null,
      expiresAt: expiresAt?.toISOString() ?? null,
    };
    sendData(res, body);
  };

  logout: RequestHandler = (req, res) => {
    res.clearCookie(ADMIN_COOKIE_NAME, cookieOptions(req));
    const body: AdminSession = { authenticated: false, expiresAt: null };
    sendData(res, body);
  };
}
