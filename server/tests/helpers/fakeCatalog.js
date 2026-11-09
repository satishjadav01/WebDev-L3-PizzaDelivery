const makeId = (n) => n.toString(16).padStart(24, '0');

const PIZZA_ID_OFFSET = 0xa000;
const ORDER_ID_OFFSET = 0xb000;

/**
 * In-memory inventory seeded from the shipped seed file, so tests exercise real catalog
 * data. Mirrors inventory.repository.js, including the atomic "decrement if enough" rule.
 */
export function createFakeInventoryRepository({ inventorySeed, inventoryConfig }) {
  const items = inventorySeed.items.map((seed, index) => ({
    _id: makeId(index + 1),
    isActive: true,
    lastAlertedAt: null,
    threshold: inventoryConfig.categories[seed.category].defaultThreshold,
    ...seed,
  }));
  const find = (id) => items.find((item) => item._id === String(id)) ?? null;

  return {
    items,
    byKey: (key) => items.find((item) => item.key === key),
    snapshot: () => structuredClone(items),
    restore(saved) {
      items.splice(0, items.length, ...saved);
    },
    async findById(id) {
      return find(id);
    },
    async findByIds(ids) {
      return ids.map(find).filter(Boolean);
    },
    async listActive() {
      return items.filter((item) => item.isActive);
    },
    async listAll() {
      return items;
    },
    async decrementIfAvailable({ id, units }) {
      const item = find(id);
      if (!item || item.quantity < units) return null;
      item.quantity -= units;
      return item;
    },
    async setQuantity({ id, quantity }) {
      const item = find(id);
      if (!item) return null;
      item.quantity = quantity;
      if (quantity >= item.threshold) item.lastAlertedAt = null;
      return item;
    },
    async claimLowStock({ now, cooldownMs }) {
      const staleBefore = now.getTime() - cooldownMs;
      const claimed = items.filter(
        (item) =>
          item.isActive &&
          item.quantity < item.threshold &&
          (item.lastAlertedAt === null || item.lastAlertedAt.getTime() < staleBefore),
      );
      claimed.forEach((item) => {
        item.lastAlertedAt = now;
      });
      return claimed;
    },
    async releaseLowStockClaims(ids) {
      items
        .filter((item) => ids.includes(item._id))
        .forEach((item) => {
          item.lastAlertedAt = null;
        });
    },
    async updateThreshold({ id, threshold }) {
      const item = find(id);
      if (!item) return null;
      item.threshold = threshold;
      if (item.quantity >= threshold) item.lastAlertedAt = null;
      return item;
    },
  };
}

/** Menu pizzas built from the shipped menu seed, with ingredient documents resolved. */
export function createFakePizzaRepository({ menuSeed, inventoryRepository }) {
  const pizzas = menuSeed.pizzas.map((seed, index) => ({
    _id: makeId(PIZZA_ID_OFFSET + index),
    isAvailable: true,
    ...seed,
    ingredients: seed.ingredients.map((key) => inventoryRepository.byKey(key)),
  }));

  return {
    pizzas,
    byKey: (key) => pizzas.find((pizza) => pizza.key === key),
    async listAvailable() {
      return pizzas.filter((pizza) => pizza.isAvailable);
    },
    async findManyByIds(ids) {
      return pizzas.filter((pizza) => pizza.isAvailable && ids.includes(pizza._id));
    },
  };
}

/** In-memory orders with the same guarded updates the real repository performs. */
export function createFakeOrderRepository({ clock, userRepository }) {
  const orders = [];
  let sequence = 0;
  const find = (id) => orders.find((order) => order._id === String(id)) ?? null;

  return {
    orders,
    snapshot: () => structuredClone(orders),
    restore(saved) {
      orders.splice(0, orders.length, ...saved);
    },
    async create(fields) {
      const order = {
        _id: makeId(ORDER_ID_OFFSET + (sequence += 1)),
        createdAt: clock.now(),
        ...fields,
      };
      orders.push(order);
      return order;
    },
    async findById(id) {
      return find(id);
    },
    async listByUser(userId) {
      return orders.filter((order) => String(order.user) === String(userId)).reverse();
    },
    async listPage({ statuses, skip, limit }) {
      const matching = orders
        .filter((order) => !statuses || statuses.includes(order.status))
        .reverse();
      const page = matching.slice(skip, skip + limit).map((order) => ({
        ...order,
        user: userRepository.users.find((user) => user._id === String(order.user)) ?? order.user,
      }));
      return { orders: page, total: matching.length };
    },
    async markPaid({ id, toStatus, paidStatus, providerPaymentId, paidAt, historyEntry }) {
      const order = find(id);
      if (!order || order.payment.status === paidStatus) return null;
      order.status = toStatus;
      order.payment = { ...order.payment, status: paidStatus, providerPaymentId, paidAt };
      order.statusHistory.push(historyEntry);
      return order;
    },
    async transitionStatus({ id, from, to, historyEntry, paymentStatus }) {
      const order = find(id);
      if (!order || order.status !== from) return null;
      order.status = to;
      if (paymentStatus) order.payment = { ...order.payment, status: paymentStatus };
      order.statusHistory.push(historyEntry);
      return order;
    },
  };
}

/** Transaction runner that rolls back every touched repository when the work throws. */
export function createFakeTransactionRunner(statefulRepositories) {
  return async (work) => {
    const saved = statefulRepositories.map((repository) => repository.snapshot());
    try {
      return await work(undefined);
    } catch (error) {
      statefulRepositories.forEach((repository, index) => repository.restore(saved[index]));
      throw error;
    }
  };
}
