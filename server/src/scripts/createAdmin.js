import { buildConfig } from '../config/index.js';
import { createContainer } from '../container.js';
import { connectDatabase, disconnectDatabase } from '../db/connection.js';
import { createLogger } from '../utils/logger.js';

const FAILURE_EXIT_CODE = 1;

async function main() {
  const config = buildConfig();
  const { ADMIN_EMAIL: email, ADMIN_PASSWORD: password } = config.env;
  if (!email || !password) {
    throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD in .env before creating the admin.');
  }

  const logger = createLogger({
    name: `${config.app.name}-create-admin`,
    level: config.env.LOG_LEVEL,
    redactPaths: config.security.logRedactPaths,
  });
  await connectDatabase({ uri: config.env.MONGODB_URI, options: config.app.database, logger });

  try {
    const { services } = createContainer({ config, logger });
    const { created } = await services.auth.provisionAdmin({ email, password });
    console.log(created ? `Admin created: ${email}` : `Admin already exists: ${email}`);
  } finally {
    await disconnectDatabase();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(FAILURE_EXIT_CODE);
});
