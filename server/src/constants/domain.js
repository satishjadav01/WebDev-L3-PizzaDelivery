export const TOKEN_TYPE = Object.freeze({
  EMAIL_VERIFICATION: 'email_verification',
  PASSWORD_RESET: 'password_reset',
});

export const INVENTORY_CATEGORY = Object.freeze({
  BASE: 'base',
  SAUCE: 'sauce',
  CHEESE: 'cheese',
  VEGGIE: 'veggie',
});

export const ORDER_STATUS = Object.freeze({
  AWAITING_PAYMENT: 'awaiting_payment',
  PAYMENT_FAILED: 'payment_failed',
  ORDER_RECEIVED: 'order_received',
  IN_KITCHEN: 'in_kitchen',
  SENT_TO_DELIVERY: 'sent_to_delivery',
});

export const PAYMENT_STATUS = Object.freeze({
  CREATED: 'created',
  PAID: 'paid',
  FAILED: 'failed',
});

// Who is performing a state change; the system acts on payment results.
export const ACTOR = Object.freeze({
  SYSTEM: 'system',
  CUSTOMER: 'customer',
  ADMIN: 'admin',
});

export const ORDER_LINE_KIND = Object.freeze({
  MENU: 'menu',
  CUSTOM: 'custom',
});
