import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { ERROR_CODE, HTTP_STATUS, ORDER_STATUS } from '../../src/constants/index.js';
import { createTestApp } from '../helpers/testApp.js';
import { apiBase, signInAdmin, signInCustomer } from '../helpers/session.js';

let ctx;
let api;
let base;
let admin;
let customer;

beforeEach(async () => {
  ctx = createTestApp();
  api = request(ctx.app);
  base = apiBase(ctx.config);
  admin = await signInAdmin(ctx);
  customer = await signInCustomer(ctx);
});

const asAdmin = (builder) => builder.set('Authorization', admin.header);
const asCustomer = (builder) => builder.set('Authorization', customer.header);
const itemId = (key) => ctx.fakes.repositories.inventory.byKey(key)._id;

async function placePaidOrder() {
  const pizza = ctx.fakes.repositories.pizza.byKey('margherita');
  const placed = await asCustomer(api.post(`${base}/orders`)).send({
    lines: [{ kind: 'menu', pizzaId: pizza._id, quantity: 1 }],
  });
  const orderId = placed.body.order.id;
  const checkout = await asCustomer(api.post(`${base}/orders/${orderId}/mock-checkout`)).send({
    outcome: 'success',
  });
  await asCustomer(api.post(`${base}/orders/${orderId}/payment`)).send({
    providerPaymentId: checkout.body.providerPaymentId,
    signature: checkout.body.signature,
  });
  return orderId;
}

describe('admin access control', () => {
  it.each([
    ['GET', '/admin/inventory'],
    ['GET', '/admin/orders'],
  ])('%s %s is closed to customers and anonymous callers', async (method, path) => {
    const anonymous = await api[method.toLowerCase()](`${base}${path}`);
    expect(anonymous.status).toBe(HTTP_STATUS.UNAUTHORIZED);

    const customerRes = await asCustomer(api[method.toLowerCase()](`${base}${path}`));
    expect(customerRes.status).toBe(HTTP_STATUS.FORBIDDEN);
  });
});

describe('inventory management', () => {
  it('lists every item with its stock level and low flag', async () => {
    ctx.fakes.repositories.inventory.byKey('base-thin').quantity = 3;
    const res = await asAdmin(api.get(`${base}/admin/inventory`));
    expect(res.status).toBe(HTTP_STATUS.OK);

    const thin = res.body.items.find((item) => item.key === 'base-thin');
    expect(thin).toMatchObject({ quantity: 3, isLow: true, category: 'base' });
    const mozzarella = res.body.items.find((item) => item.key === 'cheese-mozzarella');
    expect(mozzarella.isLow).toBe(false);
  });

  it('sets stock by hand', async () => {
    const res = await asAdmin(api.patch(`${base}/admin/inventory/${itemId('base-thin')}`)).send({
      quantity: 250,
    });
    expect(res.status).toBe(HTTP_STATUS.OK);
    expect(res.body.item.quantity).toBe(250);
  });

  it('changes the alert threshold', async () => {
    const res = await asAdmin(api.patch(`${base}/admin/inventory/${itemId('base-thin')}`)).send({
      threshold: 40,
    });
    expect(res.body.item.threshold).toBe(40);
  });

  it('re-arms the low-stock alert once restocked above the threshold', async () => {
    const item = ctx.fakes.repositories.inventory.byKey('base-thin');
    item.quantity = 2;
    item.lastAlertedAt = new Date();
    await asAdmin(api.patch(`${base}/admin/inventory/${item._id}`)).send({ quantity: 80 });
    expect(item.lastAlertedAt).toBeNull();
  });

  it.each([
    ['an empty body', {}],
    ['a negative quantity', { quantity: -1 }],
    ['a fractional quantity', { quantity: 1.5 }],
    ['unknown fields', { quantity: 5, price: 1 }],
  ])('rejects %s', async (_label, body) => {
    const res = await asAdmin(api.patch(`${base}/admin/inventory/${itemId('base-thin')}`)).send(
      body,
    );
    expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
  });

  it('caps manual stock at the configured maximum', async () => {
    const res = await asAdmin(api.patch(`${base}/admin/inventory/${itemId('base-thin')}`)).send({
      quantity: ctx.config.inventory.maxStockQuantity + 1,
    });
    expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
  });

  it('answers 404 for an item that does not exist', async () => {
    const res = await asAdmin(api.patch(`${base}/admin/inventory/${'e'.repeat(24)}`)).send({
      quantity: 5,
    });
    expect(res.status).toBe(HTTP_STATUS.NOT_FOUND);
  });
});

describe('order management', () => {
  it('shows incoming orders with the customer and filters by status', async () => {
    const orderId = await placePaidOrder();
    const all = await asAdmin(api.get(`${base}/admin/orders`));
    expect(all.body.total).toBe(1);
    expect(all.body.orders[0]).toMatchObject({
      id: orderId,
      customer: { email: 'asha@example.test' },
    });

    const none = await asAdmin(api.get(`${base}/admin/orders?status=${ORDER_STATUS.IN_KITCHEN}`));
    expect(none.body.total).toBe(0);

    const several = ['order_received', ORDER_STATUS.IN_KITCHEN].join(',');
    const paid = await asAdmin(api.get(`${base}/admin/orders?status=${several}`));
    expect(paid.body.total).toBe(1);

    const unknown = await asAdmin(api.get(`${base}/admin/orders?status=bogus`));
    expect(unknown.status).toBe(HTTP_STATUS.BAD_REQUEST);
  });

  it('walks an order through the kitchen and the customer sees each step', async () => {
    const orderId = await placePaidOrder();
    const move = (status) =>
      asAdmin(api.patch(`${base}/admin/orders/${orderId}/status`)).send({ status });
    const customerView = async () =>
      (await asCustomer(api.get(`${base}/orders/${orderId}`))).body.order;

    expect((await customerView()).statusLabel).toBe('Order Received');

    expect((await move(ORDER_STATUS.IN_KITCHEN)).status).toBe(HTTP_STATUS.OK);
    expect((await customerView()).statusLabel).toBe('In Kitchen');

    expect((await move(ORDER_STATUS.SENT_TO_DELIVERY)).status).toBe(HTTP_STATUS.OK);
    const final = await customerView();
    expect(final.statusLabel).toBe('Sent to Delivery');
    expect(final.tracker.every((step) => step.reached)).toBe(true);
    expect(final.history.map((entry) => entry.status)).toEqual([
      ORDER_STATUS.AWAITING_PAYMENT,
      ORDER_STATUS.ORDER_RECEIVED,
      ORDER_STATUS.IN_KITCHEN,
      ORDER_STATUS.SENT_TO_DELIVERY,
    ]);
  });

  it('refuses to skip a step or go backwards', async () => {
    const orderId = await placePaidOrder();
    const skip = await asAdmin(api.patch(`${base}/admin/orders/${orderId}/status`)).send({
      status: ORDER_STATUS.SENT_TO_DELIVERY,
    });
    expect(skip.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
    expect(skip.body.error.code).toBe(ERROR_CODE.INVALID_STATUS_TRANSITION);
    expect(skip.body.error.details.allowed).toEqual([ORDER_STATUS.IN_KITCHEN]);
  });

  it('will not let an admin mark an unpaid order as received', async () => {
    const pizza = ctx.fakes.repositories.pizza.byKey('margherita');
    const placed = await asCustomer(api.post(`${base}/orders`)).send({
      lines: [{ kind: 'menu', pizzaId: pizza._id, quantity: 1 }],
    });
    const res = await asAdmin(
      api.patch(`${base}/admin/orders/${placed.body.order.id}/status`),
    ).send({ status: ORDER_STATUS.ORDER_RECEIVED });
    expect(res.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
  });

  it('answers 404 for an unknown order', async () => {
    const res = await asAdmin(api.patch(`${base}/admin/orders/${'c'.repeat(24)}/status`)).send({
      status: ORDER_STATUS.IN_KITCHEN,
    });
    expect(res.status).toBe(HTTP_STATUS.NOT_FOUND);
  });
});
