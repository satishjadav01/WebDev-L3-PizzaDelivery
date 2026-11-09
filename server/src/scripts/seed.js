import inventoryConfig from '../../config/inventory.config.js';
import inventorySeed from '../../config/inventory.seed.json' with { type: 'json' };
import menuSeed from '../../config/menu.seed.json' with { type: 'json' };
import { buildConfig } from '../config/index.js';
import { connectDatabase, disconnectDatabase } from '../db/connection.js';
import { inventoryRepository } from '../repositories/inventory.repository.js';
import { pizzaRepository } from '../repositories/pizza.repository.js';
import { seedCatalog } from '../seed/seedCatalog.js';
import { createLogger } from '../utils/logger.js';

const FAILURE_EXIT_CODE = 1;

async function main() {
  const config = buildConfig();
  const logger = createLogger({
    name: `${config.app.name}-seed`,
    level: config.env.LOG_LEVEL,
    redactPaths: config.security.logRedactPaths,
  });

  await connectDatabase({
    uri: config.env.MONGODB_URI,
    options: config.app.database,
    logger,
  });
  try {
    await seedCatalog({
      inventorySeed,
      menuSeed,
      inventoryConfig,
      inventoryRepository,
      pizzaRepository,
      logger,
    });
  } finally {
    await disconnectDatabase();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(FAILURE_EXIT_CODE);
});
