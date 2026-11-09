import { ACTOR, ORDER_STATUS } from '../src/constants/index.js';

const { AWAITING_PAYMENT, PAYMENT_FAILED, ORDER_RECEIVED, IN_KITCHEN, SENT_TO_DELIVERY } =
  ORDER_STATUS;

export default {
  currency: {
    code: 'INR',
    // Money is stored as integers in the smallest unit (paise) to avoid float drift.
    minorUnitFactor: 100,
  },
  limits: {
    maxQuantityPerLine: 10,
    maxLinesPerOrder: 10,
  },
  pricing: {
    customPizzaName: 'Custom Pizza',
    customPizzaPreparationFeeMinor: 5_000,
  },
  statusLabels: {
    [AWAITING_PAYMENT]: 'Awaiting Payment',
    [PAYMENT_FAILED]: 'Payment Failed',
    [ORDER_RECEIVED]: 'Order Received',
    [IN_KITCHEN]: 'In Kitchen',
    [SENT_TO_DELIVERY]: 'Sent to Delivery',
  },
  // The steps a customer sees on the live tracker, in order.
  trackerSteps: [ORDER_RECEIVED, IN_KITCHEN, SENT_TO_DELIVERY],
  // The only legal status changes, and who may perform each.
  transitions: [
    { from: AWAITING_PAYMENT, to: ORDER_RECEIVED, actors: [ACTOR.SYSTEM] },
    { from: AWAITING_PAYMENT, to: PAYMENT_FAILED, actors: [ACTOR.SYSTEM] },
    { from: ORDER_RECEIVED, to: IN_KITCHEN, actors: [ACTOR.ADMIN] },
    { from: IN_KITCHEN, to: SENT_TO_DELIVERY, actors: [ACTOR.ADMIN] },
  ],
};
