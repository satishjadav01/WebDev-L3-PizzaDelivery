import { Order } from '../models/order.model.js';

const withSession = (query, session) => (session ? query.session(session) : query);

export const orderRepository = {
  create(fields) {
    return Order.create(fields);
  },

  findById(id) {
    return Order.findById(id);
  },

  listByUser(userId) {
    return Order.find({ user: userId }).sort({ createdAt: -1 });
  },

  /** Admin listing, newest first, optionally narrowed to some statuses. */
  async listPage({ statuses, skip, limit }) {
    const filter = statuses ? { status: { $in: statuses } } : {};
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'name email'),
      Order.countDocuments(filter),
    ]);
    return { orders, total };
  },

  /**
   * Marks an order paid only while its payment is still pending. A null result means another
   * request got there first, which callers treat as "already processed".
   */
  markPaid(
    { id, toStatus, paidStatus, providerPaymentId, paidAt, historyEntry },
    { session } = {},
  ) {
    return withSession(
      Order.findOneAndUpdate(
        { _id: id, 'payment.status': { $ne: paidStatus } },
        {
          $set: {
            status: toStatus,
            'payment.status': paidStatus,
            'payment.providerPaymentId': providerPaymentId,
            'payment.paidAt': paidAt,
          },
          $push: { statusHistory: historyEntry },
        },
        { returnDocument: 'after' },
      ),
      session,
    );
  },

  /** Moves an order between statuses only if it is still in `from`, so moves cannot race. */
  transitionStatus({ id, from, to, historyEntry, paymentStatus }, { session } = {}) {
    const set = { status: to };
    if (paymentStatus) set['payment.status'] = paymentStatus;
    return withSession(
      Order.findOneAndUpdate(
        { _id: id, status: from },
        { $set: set, $push: { statusHistory: historyEntry } },
        { returnDocument: 'after' },
      ),
      session,
    );
  },
};
