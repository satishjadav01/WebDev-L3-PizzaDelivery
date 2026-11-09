import { InventoryItem } from '../models/inventoryItem.model.js';

const withSession = (query, session) => (session ? query.session(session) : query);

export const inventoryRepository = {
  /**
   * Creates the item or refreshes its descriptive fields. Stock fields are written only
   * on insert, so re-running the seed never resets live quantities.
   */
  async upsertFromSeed({ key, category, name, priceMinor, quantity, threshold }) {
    return InventoryItem.findOneAndUpdate(
      { key },
      {
        $set: { category, name, priceMinor },
        $setOnInsert: { quantity, threshold, lastAlertedAt: null, isActive: true },
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    );
  },

  findById(id) {
    return InventoryItem.findById(id);
  },

  findByIds(ids) {
    return InventoryItem.find({ _id: { $in: ids } });
  },

  listActive() {
    return InventoryItem.find({ isActive: true }).sort({ category: 1, name: 1 });
  },

  listAll() {
    return InventoryItem.find().sort({ category: 1, name: 1 });
  },

  /**
   * Takes `units` out of stock only if that many remain, in one atomic step. Resolves to the
   * updated item, or null when stock is insufficient, so overselling is impossible even
   * under concurrent orders.
   */
  decrementIfAvailable({ id, units }, { session } = {}) {
    return withSession(
      InventoryItem.findOneAndUpdate(
        { _id: id, quantity: { $gte: units } },
        { $inc: { quantity: -units } },
        { returnDocument: 'after' },
      ),
      session,
    );
  },

  /** Sets stock by hand. Climbing back above the threshold re-arms the low-stock alert. */
  setQuantity({ id, quantity }) {
    return InventoryItem.findOneAndUpdate(
      { _id: id },
      [
        {
          $set: {
            quantity,
            lastAlertedAt: {
              $cond: [{ $gte: [quantity, '$threshold'] }, null, '$lastAlertedAt'],
            },
          },
        },
      ],
      { returnDocument: 'after', updatePipeline: true },
    );
  },

  /**
   * Atomically claims every item that is below its threshold and has not been alerted within
   * the cooldown, stamping `lastAlertedAt`. Each claim is its own guarded update, so two app
   * instances running the job at once can never alert for the same item twice.
   */
  async claimLowStock({ now, cooldownMs }) {
    const staleBefore = new Date(now.getTime() - cooldownMs);
    const filter = {
      isActive: true,
      $expr: { $lt: ['$quantity', '$threshold'] },
      $or: [{ lastAlertedAt: null }, { lastAlertedAt: { $lt: staleBefore } }],
    };

    const candidates = await InventoryItem.find(filter).select('_id');
    const claimed = await Promise.all(
      candidates.map((candidate) =>
        InventoryItem.findOneAndUpdate(
          { ...filter, _id: candidate._id },
          { $set: { lastAlertedAt: now } },
          { returnDocument: 'after' },
        ),
      ),
    );
    return claimed.filter(Boolean);
  },

  /** Gives claims back after a failed send so the next run retries them. */
  releaseLowStockClaims(ids) {
    return InventoryItem.updateMany({ _id: { $in: ids } }, { $set: { lastAlertedAt: null } });
  },

  updateThreshold({ id, threshold }) {
    return InventoryItem.findOneAndUpdate(
      { _id: id },
      [
        {
          $set: {
            threshold,
            lastAlertedAt: { $cond: [{ $gte: ['$quantity', threshold] }, null, '$lastAlertedAt'] },
          },
        },
      ],
      { returnDocument: 'after', updatePipeline: true },
    );
  },
};
