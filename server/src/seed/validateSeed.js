/**
 * Checks seed data against the inventory rules before anything touches the database.
 * Returns a list of human-readable problems; an empty list means the data is consistent.
 */
export function findSeedProblems({ inventorySeed, menuSeed, inventoryConfig }) {
  const problems = [];
  const itemsByKey = new Map();

  for (const item of inventorySeed.items) {
    if (itemsByKey.has(item.key)) problems.push(`duplicate inventory key "${item.key}"`);
    itemsByKey.set(item.key, item);

    if (!inventoryConfig.categories[item.category]) {
      problems.push(`inventory "${item.key}" has unknown category "${item.category}"`);
    }
    if (!Number.isInteger(item.priceMinor) || item.priceMinor < 0) {
      problems.push(`inventory "${item.key}" needs a non-negative integer priceMinor`);
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 0) {
      problems.push(`inventory "${item.key}" needs a non-negative integer quantity`);
    }
  }

  const pizzaKeys = new Set();
  for (const pizza of menuSeed.pizzas) {
    if (pizzaKeys.has(pizza.key)) problems.push(`duplicate pizza key "${pizza.key}"`);
    pizzaKeys.add(pizza.key);

    const perCategory = {};
    for (const ingredientKey of pizza.ingredients) {
      const item = itemsByKey.get(ingredientKey);
      if (!item) {
        problems.push(`pizza "${pizza.key}" references unknown ingredient "${ingredientKey}"`);
        continue;
      }
      perCategory[item.category] = (perCategory[item.category] ?? 0) + 1;
    }

    for (const [category, rules] of Object.entries(inventoryConfig.categories)) {
      const count = perCategory[category] ?? 0;
      if (count < rules.selection.min || count > rules.selection.max) {
        problems.push(
          `pizza "${pizza.key}" has ${count} ${category} item(s); allowed ${rules.selection.min}-${rules.selection.max}`,
        );
      }
    }
  }

  return problems;
}
