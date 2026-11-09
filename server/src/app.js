import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import { createRateLimiter } from './middleware/rateLimiter.js';
import { requestLogger } from './middleware/requestLogger.js';
import { createContainer } from './container.js';
import { createApiRouter } from './routes/index.js';

/** Builds the Express app without binding a port, so tests can drive it directly. */
export function createApp({ config, logger, container = createContainer({ config, logger }) }) {
  const { security, app: appConfig, env } = config;
  const app = express();

  app.disable('x-powered-by');
  app.use(requestLogger({ logger, headerName: security.requestIdHeader }));
  app.use(helmet());
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      methods: security.cors.methods,
      allowedHeaders: security.cors.allowedHeaders,
      maxAge: security.cors.maxAgeSeconds,
    }),
  );
  app.use(express.json({ limit: security.bodyLimit }));
  app.use(
    createRateLimiter(security.rateLimit.general, {
      standardHeaders: security.rateLimit.standardHeaders,
    }),
  );

  app.use(`${appConfig.api.prefix}/${appConfig.api.version}`, createApiRouter({ container }));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
