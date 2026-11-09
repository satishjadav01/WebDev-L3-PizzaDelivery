import { describe, expect, it } from 'vitest';
import orderConfig from '../../config/order.config.js';
import { ACTOR, ERROR_CODE, ORDER_STATUS } from '../../src/constants/index.js';
import { createOrderStatusService } from '../../src/services/orderStatus.service.js';

const statusService = createOrderStatusService({ orderConfig });
const { AWAITING_PAYMENT, ORDER_RECEIVED, IN_KITCHEN, SENT_TO_DELIVERY, PAYMENT_FAILED } =
  ORDER_STATUS;

describe('order status rules', () => {
  it('uses the exact customer-facing labels from the brief', () => {
    expect(statusService.labelOf(ORDER_RECEIVED)).toBe('Order Received');
    expect(statusService.labelOf(IN_KITCHEN)).toBe('In Kitchen');
    expect(statusService.labelOf(SENT_TO_DELIVERY)).toBe('Sent to Delivery');
  });

  it('lets the admin walk an order forward one step at a time', () => {
    expect(() =>
      statusService.assertTransition({ from: ORDER_RECEIVED, to: IN_KITCHEN, actor: ACTOR.ADMIN }),
    ).not.toThrow();
    expect(() =>
      statusService.assertTransition({
        from: IN_KITCHEN,
        to: SENT_TO_DELIVERY,
        actor: ACTOR.ADMIN,
      }),
    ).not.toThrow();
  });

  it.each([
    ['skipping a step', ORDER_RECEIVED, SENT_TO_DELIVERY, ACTOR.ADMIN],
    ['going backwards', IN_KITCHEN, ORDER_RECEIVED, ACTOR.ADMIN],
    ['leaving the final state', SENT_TO_DELIVERY, IN_KITCHEN, ACTOR.ADMIN],
    ['an admin settling payment', AWAITING_PAYMENT, ORDER_RECEIVED, ACTOR.ADMIN],
    ['a customer moving the kitchen', ORDER_RECEIVED, IN_KITCHEN, ACTOR.CUSTOMER],
    ['reviving a failed payment', PAYMENT_FAILED, ORDER_RECEIVED, ACTOR.SYSTEM],
  ])('rejects %s', (_label, from, to, actor) => {
    expect(() => statusService.assertTransition({ from, to, actor })).toThrowError(
      expect.objectContaining({ code: ERROR_CODE.INVALID_STATUS_TRANSITION }),
    );
  });

  it('lets the system settle or fail a pending payment', () => {
    expect(statusService.allowedNext(AWAITING_PAYMENT, ACTOR.SYSTEM)).toEqual([
      ORDER_RECEIVED,
      PAYMENT_FAILED,
    ]);
  });

  it('reports which tracker steps an order has reached', () => {
    const reached = (status) => statusService.trackerFor(status).map((step) => step.reached);
    expect(reached(AWAITING_PAYMENT)).toEqual([false, false, false]);
    expect(reached(ORDER_RECEIVED)).toEqual([true, false, false]);
    expect(reached(IN_KITCHEN)).toEqual([true, true, false]);
    expect(reached(SENT_TO_DELIVERY)).toEqual([true, true, true]);
  });
});
