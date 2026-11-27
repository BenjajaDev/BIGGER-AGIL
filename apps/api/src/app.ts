import cors from 'cors';
import express, { type Express, type Response } from 'express';
import helmet from 'helmet';
import { resolve } from 'node:path';
import { pinoHttp } from 'pino-http';
import type { Env } from './config/env.js';
import { buildApiRouters, type ContainerDependencies } from './container.js';
import { createErrorHandler, notFoundHandler } from './core/middleware/error-handler.js';

export const API_PREFIX = '/api/v1';

export interface AppDependencies extends ContainerDependencies {
  env: Pick<Env, 'CORS_ORIGINS'> & Partial<Pick<Env, 'WEB_DIST_DIR'>>;
}

const IMMUTABLE = 'public, max-age=31536000, immutable';
const ASSET_FILE = /\/assets\/[^/]+$/;
/** SPA routes never have a file extension; a missing `/assets/x.js` must stay a 404. */
const HAS_EXTENSION = /\.[A-Za-z0-9]+$/;

/**
 * Serves the compiled web app from the same server as the API (the installed system). Vite
 * fingerprints everything under `/assets`, so those are cached for good; `index.html` and the
 * rest are revalidated so a new version shows up on the next open.
 */
function serveWeb(app: Express, webDistDir: string): void {
  const root = resolve(webDistDir);
  const indexHtml = (res: Response): void => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile('index.html', { root });
  };
  app.use(
    express.static(root, {
      index: false,
      setHeaders: (res, filePath) => {
        res.setHeader(
          'Cache-Control',
          ASSET_FILE.test(filePath.replaceAll('\\', '/')) ? IMMUTABLE : 'no-cache',
        );
      },
    }),
  );
  app.use((req, res, next) => {
    const isApi = req.path === '/api' || req.path.startsWith('/api/');
    if (
      (req.method !== 'GET' && req.method !== 'HEAD') ||
      isApi ||
      HAS_EXTENSION.test(req.path) ||
      !req.accepts('html')
    ) {
      next();
      return;
    }
    indexHtml(res);
  });
}

export function createApp({ env, logger, ...container }: AppDependencies): Express {
  const app = express();

  app.disable('x-powered-by');
  // The installed system is reached over plain http on the local network, so the default CSP
  // directive that upgrades every request to https would break its own scripts and styles.
  app.use(helmet({ contentSecurityPolicy: { directives: { 'upgrade-insecure-requests': null } } }));
  // Credentials allow the httpOnly admin cookie when the web app is served from another port.
  app.use(cors({ origin: env.CORS_ORIGINS, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(pinoHttp({ logger }));

  // Image files are immutable (new upload = new id), so they can be cached for a year.
  app.use(
    `${API_PREFIX}/media`,
    (_req, res, next) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      next();
    },
    express.static(container.uploadsDir, { immutable: true, maxAge: '365d', index: false }),
  );
  app.use(API_PREFIX, ...buildApiRouters({ ...container, logger }));
  if (env.WEB_DIST_DIR !== undefined) serveWeb(app, env.WEB_DIST_DIR);

  app.use(notFoundHandler);
  app.use(createErrorHandler(logger));

  return app;
}
