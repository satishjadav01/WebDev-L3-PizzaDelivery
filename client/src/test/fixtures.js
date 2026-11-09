export const clientConfigFixture = {
  currency: { code: 'INR', minorUnitFactor: 100 },
  limits: { maxQuantityPerLine: 10, maxLinesPerOrder: 10 },
  polling: { orderStatusIntervalMs: 5000 },
  orderStatus: {
    labels: {
      awaiting_payment: 'Awaiting Payment',
      payment_failed: 'Payment Failed',
      order_received: 'Order Received',
      in_kitchen: 'In Kitchen',
      sent_to_delivery: 'Sent to Delivery',
    },
    trackerSteps: ['order_received', 'in_kitchen', 'sent_to_delivery'],
  },
  passwordPolicy: { minLength: 8, maxLength: 72, requireDigit: true, requireLetter: true },
  pricing: { customPizzaPreparationFeeMinor: 5000 },
  payment: { provider: 'mock', simulatedCheckout: true },
};

const option = (id, name, priceMinor, inStock = true) => ({ id, name, priceMinor, inStock });

export const builderStepsFixture = [
  {
    category: 'base',
    label: 'Pizza base',
    step: 1,
    min: 1,
    max: 1,
    options: [option('b1', 'Thin Crust', 9000), option('b2', 'Cheese Burst', 12000)],
  },
  {
    category: 'sauce',
    label: 'Sauce',
    step: 2,
    min: 1,
    max: 1,
    options: [option('s1', 'Pesto', 3000), option('s2', 'Barbecue', 2500, false)],
  },
  {
    category: 'cheese',
    label: 'Cheese',
    step: 3,
    min: 1,
    max: 1,
    options: [option('c1', 'Mozzarella', 4000)],
  },
  {
    category: 'veggie',
    label: 'Vegetables',
    step: 4,
    min: 0,
    max: 2,
    options: [
      option('v1', 'Onion', 1000),
      option('v2', 'Olives', 2500),
      option('v3', 'Corn', 1500),
    ],
  },
];

export const orderFixture = (overrides = {}) => ({
  id: 'order-1',
  status: 'order_received',
  statusLabel: 'Order Received',
  amountMinor: 25000,
  currency: 'INR',
  tracker: [
    { status: 'order_received', label: 'Order Received', reached: true },
    { status: 'in_kitchen', label: 'In Kitchen', reached: false },
    { status: 'sent_to_delivery', label: 'Sent to Delivery', reached: false },
  ],
  lines: [
    {
      kind: 'menu',
      name: 'Margherita',
      quantity: 1,
      unitPriceMinor: 25000,
      ingredients: [{ name: 'Mozzarella', category: 'cheese' }],
    },
  ],
  payment: { provider: 'mock', status: 'paid' },
  history: [],
  createdAt: '2026-01-01T10:00:00.000Z',
  ...overrides,
});
