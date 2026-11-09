import inventoryConfigFile from '../../config/inventory.config.js';
import inventorySeed from '../../config/inventory.seed.json' with { type: 'json' };
import menuSeed from '../../config/menu.seed.json' with { type: 'json' };
import { createApp } from '../../src/app.js';
import { buildConfig } from '../../src/config/index.js';
import { createContainer } from '../../src/container.js';
import { createLogger } from '../../src/utils/logger.js';
import { deepMerge } from '../../src/utils/merge.js';
import {
  createFakeInventoryRepository,
  createFakeOrderRepository,
  createFakePizzaRepository,
  createFakeTransactionRunner,
} from './fakeCatalog.js';
import {
  createFakeClock,
  createFakeEmailProvider,
  createFakeTokenRepository,
  createFakeUserRepository,
} from './fakes.js';

// Lowest cost bcrypt accepts; the production value would make auth suites crawl.
const TEST_BCRYPT_ROUNDS = 4;
const TEST_CONFIG_OVERRIDES = { auth: { password: { bcryptRounds: TEST_BCRYPT_ROUNDS } } };

function buildFakes(clock) {
  const user = createFakeUserRepository();
  const inventory = createFakeInventoryRepository({
    inventorySeed,
    inventoryConfig: inventoryConfigFile,
  });
  const pizza = createFakePizzaRepository({ menuSeed, inventoryRepository: inventory });
  const order = createFakeOrderRepository({ clock, userRepository: user });
  return {
    emailProvider: createFakeEmailProvider(),
    repositories: { user, token: createFakeTokenRepository(clock), inventory, pizza, order },
    runInTransaction: createFakeTransactionRunner([inventory, order]),
  };
}

/**
 * Builds the real app against the test env from vitest.config.js, with in-memory
 * repositories seeded from the shipped catalog and a recording email provider, so no
 * database or network is involved. Pass `useFakes: false` for database-backed suites.
 */
export function createTestApp({
  envOverrides = {},
  configOverrides = {},
  overrides = {},
  useFakes = true,
} = {}) {
  const config = buildConfig(
    { ...process.env, ...envOverrides },
    deepMerge(TEST_CONFIG_OVERRIDES, configOverrides),
  );
  const logger = createLogger({
    name: config.app.name,
    level: config.env.LOG_LEVEL,
    redactPaths: config.security.logRedactPaths,
  });

  const clock = overrides.clock ?? createFakeClock();
  // Outgoing mail is always captured, even when repositories are real.
  const fakes = useFakes ? buildFakes(clock) : { emailProvider: createFakeEmailProvider() };

  const container = createContainer({
    config,
    logger,
    overrides: { clock, ...fakes, ...overrides },
  });
  const app = createApp({ config, logger, container });
  return { app, config, logger, container, clock, fakes };
}
