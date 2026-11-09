import { ORDER_LINE_KIND } from '../constants/index.js';
import { ValidationError } from '../utils/errors/index.js';

/**
 * Turns a customer's cart (ids and quantities only) into priced, snapshotted order lines.
 * Prices always come from the database: nothing the client sends is trusted for money.
 */
export function createPricingService({
  pizzaRepository,
  inventoryRepository,
  inventoryConfig,
  orderConfig,
}) {
  const snapshotOf = (item) => ({
    item: item._id,
    category: item.category,
    name: item.name,
    priceMinor: item.priceMinor,
    unitsPerPizza: inventoryConfig.categories[item.category].unitsPerPizza,
  });

  const assertCustomSelection = (items, issues, lineIndex) => {
    const counts = {};
    for (const item of items) counts[item.category] = (counts[item.category] ?? 0) + 1;

    for (const [category, rules] of Object.entries(inventoryConfig.categories)) {
      const count = counts[category] ?? 0;
      if (count < rules.selection.min || count > rules.selection.max) {
        const range =
          rules.selection.min === rules.selection.max
            ? `exactly ${rules.selection.min}`
            : `${rules.selection.min} to ${rules.selection.max}`;
        issues.push({
          path: `lines.${lineIndex}.itemIds`,
          message: `Choose ${range} ${rules.label.toLowerCase()} option(s)`,
        });
      }
    }
  };

  return {
    async priceCart(cart) {
      const pizzaIds = cart.filter((l) => l.kind === ORDER_LINE_KIND.MENU).map((l) => l.pizzaId);
      const itemIds = cart
        .filter((l) => l.kind === ORDER_LINE_KIND.CUSTOM)
        .flatMap((l) => l.itemIds);

      const [pizzas, items] = await Promise.all([
        pizzaIds.length ? pizzaRepository.findManyByIds([...new Set(pizzaIds)]) : [],
        itemIds.length ? inventoryRepository.findByIds([...new Set(itemIds)]) : [],
      ]);
      const pizzaById = new Map(pizzas.map((pizza) => [String(pizza._id), pizza]));
      const itemById = new Map(
        items.filter((item) => item.isActive).map((item) => [String(item._id), item]),
      );

      const issues = [];
      const lines = cart.map((entry, index) => {
        if (entry.kind === ORDER_LINE_KIND.MENU) {
          const pizza = pizzaById.get(entry.pizzaId);
          if (!pizza || pizza.ingredients.some((ingredient) => !ingredient.isActive)) {
            issues.push({ path: `lines.${index}.pizzaId`, message: 'This pizza is not available' });
            return null;
          }
          return {
            kind: ORDER_LINE_KIND.MENU,
            pizza: pizza._id,
            name: pizza.name,
            quantity: entry.quantity,
            unitPriceMinor: pizza.priceMinor,
            ingredients: pizza.ingredients.map(snapshotOf),
          };
        }

        const chosen = entry.itemIds.map((id) => itemById.get(id));
        if (chosen.some((item) => !item)) {
          issues.push({ path: `lines.${index}.itemIds`, message: 'An option is not available' });
          return null;
        }
        assertCustomSelection(chosen, issues, index);
        const unitPriceMinor =
          orderConfig.pricing.customPizzaPreparationFeeMinor +
          chosen.reduce((sum, item) => sum + item.priceMinor, 0);
        return {
          kind: ORDER_LINE_KIND.CUSTOM,
          name: orderConfig.pricing.customPizzaName,
          quantity: entry.quantity,
          unitPriceMinor,
          ingredients: chosen.map(snapshotOf),
        };
      });

      if (issues.length > 0) throw new ValidationError('Your order could not be priced', issues);

      return {
        lines,
        amountMinor: lines.reduce((sum, line) => sum + line.unitPriceMinor * line.quantity, 0),
        currency: orderConfig.currency.code,
      };
    },
  };
}
