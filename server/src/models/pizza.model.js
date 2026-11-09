import mongoose from 'mongoose';

const pizzaSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    imageUrl: { type: String, trim: true },
    priceMinor: { type: Number, required: true, min: 0, validate: Number.isInteger },
    // Ordering a menu pizza consumes these items, so stock stays truthful.
    ingredients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true }],
    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Pizza = mongoose.model('Pizza', pizzaSchema);
