import { Pizza } from '../models/pizza.model.js';

export const pizzaRepository = {
  upsertFromSeed({ key, name, description, priceMinor, ingredients }) {
    return Pizza.findOneAndUpdate(
      { key },
      { $set: { name, description, priceMinor, ingredients }, $setOnInsert: { isAvailable: true } },
      { upsert: true, returnDocument: 'after' },
    );
  },

  /** Menu pizzas with their ingredient documents resolved, for display and stock checks. */
  listAvailable() {
    return Pizza.find({ isAvailable: true }).sort({ name: 1 }).populate('ingredients');
  },

  findManyByIds(ids) {
    return Pizza.find({ _id: { $in: ids }, isAvailable: true }).populate('ingredients');
  },
};
