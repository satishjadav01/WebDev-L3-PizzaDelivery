import mongoose from 'mongoose';
import { INVENTORY_CATEGORY } from '../constants/index.js';

const inventoryItemSchema = new mongoose.Schema(
  {
    // Stable slug used by seed data and menu definitions.
    key: { type: String, required: true, unique: true, trim: true },
    category: {
      type: String,
      enum: Object.values(INVENTORY_CATEGORY),
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    priceMinor: { type: Number, required: true, min: 0, validate: Number.isInteger },
    quantity: { type: Number, required: true, min: 0, validate: Number.isInteger },
    threshold: { type: Number, required: true, min: 0, validate: Number.isInteger },
    // Set when a low-stock alert is claimed; cleared once stock recovers.
    lastAlertedAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const InventoryItem = mongoose.model('InventoryItem', inventoryItemSchema);
