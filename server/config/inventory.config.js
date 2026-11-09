import { INVENTORY_CATEGORY } from '../src/constants/index.js';
import { HOUR_MS } from './units.js';

const { BASE, SAUCE, CHEESE, VEGGIE } = INVENTORY_CATEGORY;

export default {
  // Per category: how the builder presents it, how many may be picked, and stock rules.
  categories: {
    [BASE]: {
      label: 'Pizza base',
      builderStep: 1,
      selection: { min: 1, max: 1 },
      defaultThreshold: 20,
      unitsPerPizza: 1,
    },
    [SAUCE]: {
      label: 'Sauce',
      builderStep: 2,
      selection: { min: 1, max: 1 },
      defaultThreshold: 15,
      unitsPerPizza: 1,
    },
    [CHEESE]: {
      label: 'Cheese',
      builderStep: 3,
      selection: { min: 1, max: 1 },
      defaultThreshold: 15,
      unitsPerPizza: 1,
    },
    [VEGGIE]: {
      label: 'Vegetables',
      builderStep: 4,
      selection: { min: 0, max: 6 },
      defaultThreshold: 10,
      unitsPerPizza: 1,
    },
  },
  lowStockAlert: {
    // A restock-then-deplete cycle re-arms the alert; otherwise wait this long between mails.
    cooldownMs: 6 * HOUR_MS,
  },
  // Upper bound accepted when an admin sets stock by hand; guards against typos.
  maxStockQuantity: 100_000,
};
