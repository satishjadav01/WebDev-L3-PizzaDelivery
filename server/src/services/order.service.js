import { ACTOR, ORDER_STATUS, PAYMENT_STATUS } from '../constants/index.js';
import { generateToken } from '../utils/crypto.js';
import {
  ConflictError,
  NotFoundError,
  OutOfStockError,
  PaymentSignatureError,
} from '../utils/errors/index.js';

const OUT_OF_STOCK_AFTER_PAYMENT_MESSAGE =
  'An ingredient sold out while you were paying. Your order was cancelled and the payment will be refunded.';

export function createOrderService({
  orderRepository,
  pricingService,
  inventoryService,
  orderStatusService,
  paymentProvider,
  paymentConfig,
  appConfig,
  runInTransaction,
  clock,
  logger,
}) {
  const historyEntry = (status, actor) => ({ status, at: clock.now(), actor });

  const loadOwned = async (userId, orderId) => {
    const order = await orderRepository.findById(orderId);
    // Same answer for "missing" and "someone else's", so ids cannot be probed.
    if (!order || String(order.user) !== String(userId)) {
      throw new NotFoundError('Order not found');
    }
    return order;
  };

  const failPayment = (order) =>
    orderRepository.transitionStatus({
      id: order._id,
      from: ORDER_STATUS.AWAITING_PAYMENT,
      to: ORDER_STATUS.PAYMENT_FAILED,
      paymentStatus: PAYMENT_STATUS.FAILED,
      historyEntry: historyEntry(ORDER_STATUS.PAYMENT_FAILED, ACTOR.SYSTEM),
    });

  return {
    /** Server-authoritative price and availability check for the summary page. Persists nothing. */
    async quote({ lines }) {
      const priced = await pricingService.priceCart(lines);
      await inventoryService.assertAvailable(inventoryService.requirementsFor(priced.lines));
      return priced;
    },

    /** Prices the cart server-side, opens a gateway order and stores ours as awaiting payment. */
    async placeOrder({ userId, lines }) {
      const priced = await pricingService.priceCart(lines);
      await inventoryService.assertAvailable(inventoryService.requirementsFor(priced.lines));

      const gatewayOrder = await paymentProvider.createOrder({
        amountMinor: priced.amountMinor,
        currency: priced.currency,
        receipt: `${paymentConfig.receiptPrefix}_${generateToken(paymentConfig.receiptByteLength)}`,
      });
      const checkout = paymentProvider.describeForClient();

      const order = await orderRepository.create({
        user: userId,
        lines: priced.lines,
        amountMinor: priced.amountMinor,
        currency: priced.currency,
        status: ORDER_STATUS.AWAITING_PAYMENT,
        statusHistory: [historyEntry(ORDER_STATUS.AWAITING_PAYMENT, ACTOR.CUSTOMER)],
        payment: {
          provider: checkout.provider,
          status: PAYMENT_STATUS.CREATED,
          providerOrderId: gatewayOrder.providerOrderId,
        },
      });

      return {
        order,
        checkout: {
          ...checkout,
          providerOrderId: gatewayOrder.providerOrderId,
          amountMinor: gatewayOrder.amountMinor,
          currency: gatewayOrder.currency,
        },
      };
    },

    /**
     * Settles a payment: verifies the gateway signature, then in ONE transaction marks the
     * order paid and takes the stock. Safe to call twice with the same payment id.
     */
    async confirmPayment({ userId, orderId, providerPaymentId, signature }) {
      const order = await loadOwned(userId, orderId);

      if (order.payment.status === PAYMENT_STATUS.PAID) {
        if (order.payment.providerPaymentId === providerPaymentId) return order;
        throw new ConflictError('This order has already been paid');
      }
      if (order.status !== ORDER_STATUS.AWAITING_PAYMENT) {
        throw new ConflictError('This order is no longer waiting for payment');
      }

      const verified = paymentProvider.verifyPayment({
        providerOrderId: order.payment.providerOrderId,
        providerPaymentId,
        signature,
      });
      if (!verified) throw new PaymentSignatureError();

      orderStatusService.assertTransition({
        from: ORDER_STATUS.AWAITING_PAYMENT,
        to: ORDER_STATUS.ORDER_RECEIVED,
        actor: ACTOR.SYSTEM,
      });
      const requirements = inventoryService.requirementsFor(order.lines);

      try {
        const paid = await runInTransaction(async (session) => {
          // Claim the order first: a concurrent duplicate request loses here and never
          // reaches the stock, which is what makes this idempotent.
          const claimed = await orderRepository.markPaid(
            {
              id: order._id,
              toStatus: ORDER_STATUS.ORDER_RECEIVED,
              paidStatus: PAYMENT_STATUS.PAID,
              providerPaymentId,
              paidAt: clock.now(),
              historyEntry: historyEntry(ORDER_STATUS.ORDER_RECEIVED, ACTOR.SYSTEM),
            },
            { session },
          );
          if (!claimed) return null;
          await inventoryService.reserve(requirements, { session });
          return claimed;
        });
        if (paid) return paid;

        const settled = await orderRepository.findById(order._id);
        if (settled.payment.providerPaymentId === providerPaymentId) return settled;
        throw new ConflictError('This order has already been paid');
      } catch (error) {
        if (error instanceof OutOfStockError) {
          logger.error(
            { orderId: String(order._id), providerPaymentId, shortages: error.details.shortages },
            'payment captured but stock ran out; manual refund required',
          );
          await failPayment(order);
          throw new OutOfStockError(error.details.shortages, OUT_OF_STOCK_AFTER_PAYMENT_MESSAGE);
        }
        throw error;
      }
    },

    /** Called when the customer closes or fails checkout. Idempotent. */
    async reportPaymentFailure({ userId, orderId }) {
      const order = await loadOwned(userId, orderId);
      if (order.status !== ORDER_STATUS.AWAITING_PAYMENT) return order;
      return (await failPayment(order)) ?? orderRepository.findById(order._id);
    },

    /** Mock provider only: hands back what the gateway's checkout widget would return. */
    async simulateCheckout({ userId, orderId, outcome }) {
      if (typeof paymentProvider.simulateCheckout !== 'function') {
        throw new NotFoundError('Simulated checkout is not available');
      }
      const order = await loadOwned(userId, orderId);
      if (order.status !== ORDER_STATUS.AWAITING_PAYMENT) {
        throw new ConflictError('This order is no longer waiting for payment');
      }
      return paymentProvider.simulateCheckout({
        providerOrderId: order.payment.providerOrderId,
        outcome,
      });
    },

    listMine: (userId) => orderRepository.listByUser(userId),
    getMine: (userId, orderId) => loadOwned(userId, orderId),

    async listAll({ status: statuses, page, pageSize }) {
      const limit = Math.min(
        pageSize ?? appConfig.pagination.defaultPageSize,
        appConfig.pagination.maxPageSize,
      );
      const { orders, total } = await orderRepository.listPage({
        statuses,
        skip: (page - 1) * limit,
        limit,
      });
      return { orders, total, page, pageSize: limit };
    },

    async changeStatus({ orderId, to }) {
      const order = await orderRepository.findById(orderId);
      if (!order) throw new NotFoundError('Order not found');

      orderStatusService.assertTransition({ from: order.status, to, actor: ACTOR.ADMIN });
      const updated = await orderRepository.transitionStatus({
        id: order._id,
        from: order.status,
        to,
        historyEntry: historyEntry(to, ACTOR.ADMIN),
      });
      if (!updated) throw new ConflictError('The order changed meanwhile, please refresh');
      return updated;
    },
  };
}
