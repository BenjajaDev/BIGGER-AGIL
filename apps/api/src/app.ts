import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import type { Env } from './config/env.js';
import { buildApiRouters, type ContainerDependencies } from './container.js';
import type { Logger } from './core/logger.js';
import { createErrorHandler, notFoundHandler } from './core/middleware/error-handler.js';

export const API_PREFIX = '/api/v1';

export interface AppDependencies extends ContainerDependencies {
  env: Pick<Env, 'CORS_ORIGINS'>;
  logger: Logger;
}

export function createApp({ env, logger, ...container }: AppDependencies): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGINS }));
  app.use(express.json({ limit: '100kb' }));
  app.use(pinoHttp({ logger }));

  app.use(API_PREFIX, ...buildApiRouters(container));

  app.use(notFoundHandler);
  app.use(createErrorHandler(logger));

  return app;
}
