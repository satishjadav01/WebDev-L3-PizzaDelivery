import mongoose from 'mongoose';
import {
  ACTOR,
  INVENTORY_CATEGORY,
  ORDER_LINE_KIND,
  ORDER_STATUS,
  PAYMENT_PROVIDER,
  PAYMENT_STATUS,
} from '../constants/index.js';

const { ObjectId } = mongoose.Schema.Types;
const positiveInt = { type: Number, required: true, min: 1, validate: Number.isInteger };
const moneyMinor = { type: Number, required: true, min: 0, validate: Number.isInteger };

// Names, prices and consumption are copied at order time so later menu edits never
// rewrite history, and stock can be reconciled from the order alone.
const ingredientSnapshotSchema = new mongoose.Schema(
  {
    item: { type: ObjectId, ref: 'InventoryItem', required: true },
    category: { type: String, enum: Object.values(INVENTORY_CATEGORY), required: true },
    name: { type: String, required: true },
    priceMinor: moneyMinor,
    unitsPerPizza: positiveInt,
  },
  { _id: false },
);

const lineSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: Object.values(ORDER_LINE_KIND), required: true },
    pizza: { type: ObjectId, ref: 'Pizza' },
    name: { type: String, required: true },
    quantity: positiveInt,
    unitPriceMinor: moneyMinor,
    ingredients: { type: [ingredientSnapshotSchema], required: true },
  },
  { _id: false },
);

const statusEntrySchema = new mongoose.Schema(
  {
    status: { type: String, enum: Object.values(ORDER_STATUS), required: true },
    at: { type: Date, required: true },
    actor: { type: String, enum: Object.values(ACTOR), required: true },
  },
  { _id: false },
);

const paymentSchema = new mongoose.Schema(
  {
    provider: { type: String, enum: Object.values(PAYMENT_PROVIDER), required: true },
    status: { type: String, enum: Object.values(PAYMENT_STATUS), required: true },
    providerOrderId: { type: String, required: true },
    providerPaymentId: { type: String },
    paidAt: { type: Date },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: ObjectId, ref: 'User', required: true, index: true },
    lines: { type: [lineSchema], validate: (lines) => lines.length > 0 },
    amountMinor: moneyMinor,
    currency: { type: String, required: true },
    status: { type: String, enum: Object.values(ORDER_STATUS), required: true, index: true },
    statusHistory: { type: [statusEntrySchema], required: true },
    payment: { type: paymentSchema, required: true },
  },
  { timestamps: true },
);

orderSchema.index({ 'payment.providerOrderId': 1 }, { unique: true });
// A gateway payment id may settle at most one order; sparse so unpaid orders are ignored.
orderSchema.index({ 'payment.providerPaymentId': 1 }, { unique: true, sparse: true });
orderSchema.index({ createdAt: -1 });

export const Order = mongoose.model('Order', orderSchema);
