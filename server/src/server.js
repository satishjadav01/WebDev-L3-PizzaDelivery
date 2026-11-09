import { buildConfig } from './config/index.js';
import cron from 'node-cron';
import { createApp } from './app.js';
import { createContainer } from './container.js';
import { connectDatabase, disconnectDatabase } from './db/connection.js';
import { createScheduler } from './jobs/scheduler.js';
import { createLogger } from './utils/logger.js';

const FAILURE_EXIT_CODE = 1;

async function main() {
  const config = buildConfig();
  const logger = createLogger({
    name: config.app.name,
    level: config.env.LOG_LEVEL,
    redactPaths: config.security.logRedactPaths,
    pretty: config.env.LOG_PRETTY,
  });

  await connectDatabase({
    uri: config.env.MONGODB_URI,
    options: config.app.database,
    logger,
  });

  const container = createContainer({ config, logger });
  const app = createApp({ config, logger, container });
  const scheduler = createScheduler({
    cron,
    jobs: container.jobs,
    settings: config.cron,
    logger,
  });
  const server = app.listen(config.env.PORT, () => {
    logger.info({ port: config.env.PORT, env: config.env.NODE_ENV }, 'server listening');
    scheduler.start();
  });

  let shuttingDown = false;
  const shutdown = (reason) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ reason }, 'shutting down');

    const forceExit = setTimeout(() => {
      logger.error('graceful shutdown timed out, forcing exit');
      process.exit(FAILURE_EXIT_CODE);
    }, config.app.server.shutdownTimeoutMs);
    forceExit.unref();

    scheduler.stop();
    server.close(async () => {
      await disconnectDatabase();
      logger.info('shutdown complete');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => {
    logger.fatal({ err: reason }, 'unhandled rejection');
    shutdown('unhandledRejection');
  });
}

main().catch((error) => {
  // The logger may not exist yet when the configuration itself is invalid.
  process.stderr.write(`${error.message}\n`);
  process.exit(FAILURE_EXIT_CODE);
});
