// Identifiers shared with the API. Display wording comes from /meta/client-config instead.

export const APP_NAME = 'Slice Society';

// Shown in the cart for a pizza the customer assembled in the builder.
export const CUSTOM_PIZZA_LABEL = 'Custom pizza';

export const ROLE = Object.freeze({
  CUSTOMER: 'customer',
  ADMIN: 'admin',
});

export const ORDER_STATUS = Object.freeze({
  AWAITING_PAYMENT: 'awaiting_payment',
  PAYMENT_FAILED: 'payment_failed',
  ORDER_RECEIVED: 'order_received',
  IN_KITCHEN: 'in_kitchen',
  SENT_TO_DELIVERY: 'sent_to_delivery',
});

export const ORDER_LINE_KIND = Object.freeze({
  MENU: 'menu',
  CUSTOM: 'custom',
});

export const INVENTORY_CATEGORY = Object.freeze({
  BASE: 'base',
  SAUCE: 'sauce',
  CHEESE: 'cheese',
  VEGGIE: 'veggie',
});

export const PAYMENT_PROVIDER = Object.freeze({
  MOCK: 'mock',
  RAZORPAY: 'razorpay',
});

export const MOCK_OUTCOME = Object.freeze({
  SUCCESS: 'success',
  FAILURE: 'failure',
});

export const HTTP_STATUS = Object.freeze({
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
});

export const ERROR_CODE = Object.freeze({
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  NETWORK: 'NETWORK_ERROR',
});

export const STORAGE_KEY = Object.freeze({
  SESSION: 'pizza.session',
  CART: 'pizza.cart',
});

export const QUERY_KEY = Object.freeze({
  CLIENT_CONFIG: ['client-config'],
  MENU: ['menu'],
  BUILDER: ['builder'],
  MY_ORDERS: ['orders', 'mine'],
  ORDER: (id) => ['orders', id],
  ADMIN_INVENTORY: ['admin', 'inventory'],
  ADMIN_ORDERS: (filters) => ['admin', 'orders', filters],
});

export const QUERY_DEFAULTS = Object.freeze({
  staleTimeMs: 30_000,
  maxRetries: 1,
});

export const RAZORPAY_CHECKOUT_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';
