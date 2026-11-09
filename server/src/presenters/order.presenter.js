import { toUserDto } from './user.presenter.js';

/** Customer and admin view of an order, with display labels resolved from config. */
export function toOrderDto(order, orderStatusService) {
  const owner = order.user && order.user.email ? toUserDto(order.user) : undefined;
  return {
    id: String(order._id),
    status: order.status,
    statusLabel: orderStatusService.labelOf(order.status),
    tracker: orderStatusService.trackerFor(order.status),
    amountMinor: order.amountMinor,
    currency: order.currency,
    customer: owner,
    lines: order.lines.map((line) => ({
      kind: line.kind,
      name: line.name,
      quantity: line.quantity,
      unitPriceMinor: line.unitPriceMinor,
      ingredients: line.ingredients.map(({ name, category }) => ({ name, category })),
    })),
    payment: { provider: order.payment.provider, status: order.payment.status },
    history: order.statusHistory.map((entry) => ({
      status: entry.status,
      label: orderStatusService.labelOf(entry.status),
      at: entry.at,
    })),
    createdAt: order.createdAt,
  };
}
