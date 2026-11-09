import { HTTP_STATUS } from '../constants/index.js';
import { toOrderDto } from '../presenters/order.presenter.js';

export function createOrderController({ orderService, orderStatusService }) {
  const present = (order) => toOrderDto(order, orderStatusService);

  return {
    async quote(req, res) {
      const { lines, amountMinor, currency } = await orderService.quote({
        lines: req.valid.body.lines,
      });
      res.json({
        quote: {
          amountMinor,
          currency,
          lines: lines.map((line) => ({
            kind: line.kind,
            name: line.name,
            quantity: line.quantity,
            unitPriceMinor: line.unitPriceMinor,
            ingredients: line.ingredients.map(({ name, category }) => ({ name, category })),
          })),
        },
      });
    },

    async place(req, res) {
      const { order, checkout } = await orderService.placeOrder({
        userId: req.auth.userId,
        lines: req.valid.body.lines,
      });
      res.status(HTTP_STATUS.CREATED).json({ order: present(order), checkout });
    },

    async confirmPayment(req, res) {
      const order = await orderService.confirmPayment({
        userId: req.auth.userId,
        orderId: req.valid.params.id,
        ...req.valid.body,
      });
      res.json({ order: present(order) });
    },

    async reportPaymentFailure(req, res) {
      const order = await orderService.reportPaymentFailure({
        userId: req.auth.userId,
        orderId: req.valid.params.id,
      });
      res.json({ order: present(order) });
    },

    async mockCheckout(req, res) {
      const result = await orderService.simulateCheckout({
        userId: req.auth.userId,
        orderId: req.valid.params.id,
        outcome: req.valid.body.outcome,
      });
      res.json(result);
    },

    async listMine(req, res) {
      const orders = await orderService.listMine(req.auth.userId);
      res.json({ orders: orders.map(present) });
    },

    async getMine(req, res) {
      const order = await orderService.getMine(req.auth.userId, req.valid.params.id);
      res.json({ order: present(order) });
    },
  };
}
