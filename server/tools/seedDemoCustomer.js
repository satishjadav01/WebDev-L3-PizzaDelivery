/**
 * Creates a ready-to-use (already email-verified) customer for demos, using the same
 * services the API uses. Only invoked by `pnpm dev:memory`; never part of production.
 */
import { buildConfig } from '../src/config/index.js';
import { createContainer } from '../src/container.js';
import { connectDatabase, disconnectDatabase } from '../src/db/connection.js';
import { createLogger } from '../src/utils/logger.js';

const FAILURE_EXIT_CODE = 1;

async function main() {
  const config = buildConfig();
  const { DEMO_CUSTOMER_EMAIL: email, DEMO_CUSTOMER_PASSWORD: password } = process.env;
  if (!email || !password)
    throw new Error('DEMO_CUSTOMER_EMAIL and DEMO_CUSTOMER_PASSWORD are required');

  const logger = createLogger({
    name: `${config.app.name}-demo-customer`,
    level: config.env.LOG_LEVEL,
    redactPaths: config.security.logRedactPaths,
  });
  await connectDatabase({ uri: config.env.MONGODB_URI, options: config.app.database, logger });

  try {
    const { services, repositories } = createContainer({ config, logger });
    if (await repositories.user.findByEmail(email)) return;
    // Skip the confirmation email: the demo customer starts verified.
    const { user } = await services.auth.register({ name: 'Demo Customer', email, password });
    await repositories.user.markEmailVerified(user._id);
  } finally {
    await disconnectDatabase();
  }
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(FAILURE_EXIT_CODE);
});
