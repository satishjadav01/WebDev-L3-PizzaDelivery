import { NotFoundError, OutOfStockError, ValidationError } from '../utils/errors/index.js';

export function createInventoryService({ inventoryRepository, inventoryConfig }) {
  const { maxStockQuantity } = inventoryConfig;

  const loadOrFail = async (id) => {
    const item = await inventoryRepository.findById(id);
    if (!item) throw new NotFoundError('Inventory item not found');
    return item;
  };

  return {
    /**
     * Totals the stock an order will consume, keyed by inventory item. Summing across lines
     * matters: the same vegetable on two lines must be checked once against the combined need.
     */
    requirementsFor(lines) {
      const requirements = new Map();
      for (const line of lines) {
        for (const ingredient of line.ingredients) {
          const key = String(ingredient.item);
          const current = requirements.get(key) ?? { name: ingredient.name, units: 0 };
          current.units += ingredient.unitsPerPizza * line.quantity;
          requirements.set(key, current);
        }
      }
      return requirements;
    },

    /** Read-only pre-check for a friendly early error; reserve() is the authoritative gate. */
    async assertAvailable(requirements) {
      const items = await inventoryRepository.findByIds([...requirements.keys()]);
      const available = new Map(items.map((item) => [String(item._id), item]));
      const shortages = [];
      for (const [id, { name, units }] of requirements) {
        const have = available.get(id)?.quantity ?? 0;
        if (have < units) shortages.push({ itemId: id, name, requested: units, available: have });
      }
      if (shortages.length > 0) throw new OutOfStockError(shortages);
    },

    /**
     * Atomically removes the required stock inside the caller's transaction. Items are taken
     * in id order so concurrent orders cannot deadlock on each other.
     */
    async reserve(requirements, { session }) {
      for (const id of [...requirements.keys()].sort()) {
        const { name, units } = requirements.get(id);
        const updated = await inventoryRepository.decrementIfAvailable({ id, units }, { session });
        if (!updated) {
          throw new OutOfStockError([{ itemId: id, name, requested: units }]);
        }
      }
    },

    getItem: loadOrFail,

    async listForAdmin() {
      const items = await inventoryRepository.listAll();
      return items.map((item) => ({ item, isLow: item.quantity < item.threshold }));
    },

    async setQuantity({ id, quantity }) {
      if (quantity > maxStockQuantity) {
        throw new ValidationError(`Quantity cannot exceed ${maxStockQuantity}`);
      }
      await loadOrFail(id);
      return inventoryRepository.setQuantity({ id, quantity });
    },

    async setThreshold({ id, threshold }) {
      if (threshold > maxStockQuantity) {
        throw new ValidationError(`Threshold cannot exceed ${maxStockQuantity}`);
      }
      await loadOrFail(id);
      return inventoryRepository.updateThreshold({ id, threshold });
    },
  };
}
