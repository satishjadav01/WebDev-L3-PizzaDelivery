import { describe, expect, it } from 'vitest';
import inventoryConfig from '../../config/inventory.config.js';
import inventorySeed from '../../config/inventory.seed.json' with { type: 'json' };
import menuSeed from '../../config/menu.seed.json' with { type: 'json' };
import { findSeedProblems } from '../../src/seed/validateSeed.js';
import { INVENTORY_CATEGORY } from '../../src/constants/index.js';

const countByCategory = (category) =>
  inventorySeed.items.filter((item) => item.category === category).length;

describe('shipped seed data', () => {
  it('is internally consistent', () => {
    expect(findSeedProblems({ inventorySeed, menuSeed, inventoryConfig })).toEqual([]);
  });

  it('offers five bases and five sauces as the builder requires', () => {
    expect(countByCategory(INVENTORY_CATEGORY.BASE)).toBe(5);
    expect(countByCategory(INVENTORY_CATEGORY.SAUCE)).toBe(5);
  });

  it('offers at least one cheese and several vegetables', () => {
    expect(countByCategory(INVENTORY_CATEGORY.CHEESE)).toBeGreaterThan(0);
    expect(countByCategory(INVENTORY_CATEGORY.VEGGIE)).toBeGreaterThan(1);
  });
});

describe('findSeedProblems', () => {
  const baseConfig = inventoryConfig;
  const item = (overrides) => ({
    key: 'k',
    category: 'base',
    name: 'n',
    priceMinor: 100,
    quantity: 1,
    ...overrides,
  });

  it('flags duplicate keys', () => {
    const problems = findSeedProblems({
      inventorySeed: { items: [item(), item()] },
      menuSeed: { pizzas: [] },
      inventoryConfig: baseConfig,
    });
    expect(problems.join()).toMatch(/duplicate inventory key/);
  });

  it('flags a pizza referencing a missing ingredient', () => {
    const problems = findSeedProblems({
      inventorySeed: { items: [item()] },
      menuSeed: { pizzas: [{ key: 'p', ingredients: ['ghost'] }] },
      inventoryConfig: baseConfig,
    });
    expect(problems.join()).toMatch(/unknown ingredient "ghost"/);
  });

  it('flags a pizza that breaks category selection rules', () => {
    const problems = findSeedProblems({
      inventorySeed: { items: [item({ key: 'b1' }), item({ key: 'b2' })] },
      menuSeed: { pizzas: [{ key: 'p', ingredients: ['b1', 'b2'] }] },
      inventoryConfig: baseConfig,
    });
    expect(problems.join()).toMatch(/pizza "p" has 2 base item/);
  });

  it('flags negative or fractional money and stock', () => {
    const problems = findSeedProblems({
      inventorySeed: { items: [item({ priceMinor: -1, quantity: 1.5 })] },
      menuSeed: { pizzas: [] },
      inventoryConfig: baseConfig,
    });
    expect(problems).toHaveLength(2);
  });
});
