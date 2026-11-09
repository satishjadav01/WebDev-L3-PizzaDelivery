import { toOrderDto } from '../../presenters/order.presenter.js';

export function createAdminOrderController({ orderService, orderStatusService }) {
  const present = (order) => toOrderDto(order, orderStatusService);

  return {
    async list(req, res) {
      const { orders, total, page, pageSize } = await orderService.listAll(req.valid.query);
      res.json({ orders: orders.map(present), total, page, pageSize });
    },

    async changeStatus(req, res) {
      const order = await orderService.changeStatus({
        orderId: req.valid.params.id,
        to: req.valid.body.status,
      });
      res.json({ order: present(order) });
    },
  };
}
