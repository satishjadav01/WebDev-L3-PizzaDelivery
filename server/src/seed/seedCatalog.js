import { findSeedProblems } from './validateSeed.js';

/**
 * Loads inventory items and menu pizzas from seed data. Safe to run repeatedly:
 * descriptive fields refresh, live stock quantities are left alone.
 */
export async function seedCatalog({
  inventorySeed,
  menuSeed,
  inventoryConfig,
  inventoryRepository,
  pizzaRepository,
  logger,
}) {
  const problems = findSeedProblems({ inventorySeed, menuSeed, inventoryConfig });
  if (problems.length > 0) {
    throw new Error(`Seed data is inconsistent:\n- ${problems.join('\n- ')}`);
  }

  const idByKey = new Map();
  for (const seedItem of inventorySeed.items) {
    const threshold =
      seedItem.threshold ?? inventoryConfig.categories[seedItem.category].defaultThreshold;
    const saved = await inventoryRepository.upsertFromSeed({ ...seedItem, threshold });
    idByKey.set(seedItem.key, saved._id);
  }

  for (const seedPizza of menuSeed.pizzas) {
    const ingredients = seedPizza.ingredients.map((key) => idByKey.get(key));
    await pizzaRepository.upsertFromSeed({ ...seedPizza, ingredients });
  }

  logger.info(
    { inventoryItems: inventorySeed.items.length, pizzas: menuSeed.pizzas.length },
    'catalog seeded',
  );
}
