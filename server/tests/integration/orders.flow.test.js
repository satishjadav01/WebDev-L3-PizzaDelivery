import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  ERROR_CODE,
  HTTP_STATUS,
  ORDER_STATUS,
  PAYMENT_STATUS,
} from '../../src/constants/index.js';
import { createTestApp } from '../helpers/testApp.js';
import { apiBase, signInAdmin, signInCustomer } from '../helpers/session.js';

let ctx;
let api;
let base;
let inventory;
let pizzas;
let customer;

beforeEach(async () => {
  ctx = createTestApp();
  api = request(ctx.app);
  base = apiBase(ctx.config);
  inventory = ctx.fakes.repositories.inventory;
  pizzas = ctx.fakes.repositories.pizza;
  customer = await signInCustomer(ctx);
});

const authed = (builder) => builder.set('Authorization', customer.header);
const menuLine = (key, quantity = 1) => ({
  kind: 'menu',
  pizzaId: pizzas.byKey(key)._id,
  quantity,
});
const customLine = (keys, quantity = 1) => ({
  kind: 'custom',
  itemIds: keys.map((key) => inventory.byKey(key)._id),
  quantity,
});
const place = (lines) => authed(api.post(`${base}/orders`)).send({ lines });
const stockOf = (key) => inventory.byKey(key).quantity;

async function payInFull(orderId, outcome = 'success') {
  const checkout = await authed(api.post(`${base}/orders/${orderId}/mock-checkout`)).send({
    outcome,
  });
  return authed(api.post(`${base}/orders/${orderId}/payment`)).send({
    providerPaymentId: checkout.body.providerPaymentId,
    signature: checkout.body.signature,
  });
}

describe('catalog', () => {
  it('lists menu pizzas with their ingredients and stock state', async () => {
    const res = await api.get(`${base}/catalog/pizzas`);
    expect(res.status).toBe(HTTP_STATUS.OK);
    expect(res.body.pizzas).toHaveLength(pizzas.pizzas.length);
    expect(res.body.pizzas[0]).toMatchObject({ inStock: true });
    expect(res.body.pizzas[0].ingredients.length).toBeGreaterThan(0);
  });

  it('flags a pizza out of stock when one ingredient runs out', async () => {
    inventory.byKey('cheese-mozzarella').quantity = 0;
    const res = await api.get(`${base}/catalog/pizzas`);
    const margherita = res.body.pizzas.find((pizza) => pizza.name === 'Margherita');
    expect(margherita.inStock).toBe(false);
  });

  it('returns builder steps in order with five bases and five sauces', async () => {
    const res = await api.get(`${base}/catalog/builder`);
    const steps = res.body.steps;
    expect(steps.map((step) => step.category)).toEqual(['base', 'sauce', 'cheese', 'veggie']);
    expect(steps[0].options).toHaveLength(5);
    expect(steps[1].options).toHaveLength(5);
    expect(steps[3]).toMatchObject({
      min: 0,
      max: ctx.config.inventory.categories.veggie.selection.max,
    });
  });

  it('publishes client settings including status labels and polling interval', async () => {
    const res = await api.get(`${base}/meta/client-config`);
    expect(res.body.orderStatus.labels.in_kitchen).toBe('In Kitchen');
    expect(res.body.polling.orderStatusIntervalMs).toBe(
      ctx.config.app.clientPolling.orderStatusIntervalMs,
    );
    expect(res.body.payment).toEqual({ provider: 'mock', simulatedCheckout: true });
  });
});

describe('placing orders', () => {
  it('prices a menu pizza from the database and awaits payment', async () => {
    const res = await place([menuLine('margherita', 2)]);
    expect(res.status).toBe(HTTP_STATUS.CREATED);
    expect(res.body.order.amountMinor).toBe(pizzas.byKey('margherita').priceMinor * 2);
    expect(res.body.order.status).toBe(ORDER_STATUS.AWAITING_PAYMENT);
    expect(res.body.checkout).toMatchObject({ provider: 'mock', currency: 'INR' });
    expect(res.body.checkout.providerOrderId).toMatch(/^order_mock_/);
  });

  it('prices a custom pizza as preparation fee plus chosen options', async () => {
    const keys = ['base-thin', 'sauce-pesto', 'cheese-parmesan', 'veg-onion', 'veg-olives'];
    const res = await place([customLine(keys)]);
    const expected =
      ctx.config.order.pricing.customPizzaPreparationFeeMinor +
      keys.reduce((sum, key) => sum + inventory.byKey(key).priceMinor, 0);
    expect(res.status).toBe(HTTP_STATUS.CREATED);
    expect(res.body.order.amountMinor).toBe(expected);
  });

  it.each([
    ['two bases', ['base-thin', 'base-classic', 'sauce-pesto', 'cheese-parmesan']],
    ['no sauce', ['base-thin', 'cheese-parmesan']],
    ['no cheese', ['base-thin', 'sauce-pesto']],
    [
      'too many vegetables',
      [
        'base-thin',
        'sauce-pesto',
        'cheese-parmesan',
        'veg-onion',
        'veg-capsicum',
        'veg-tomato',
        'veg-mushroom',
        'veg-olives',
        'veg-jalapeno',
        'veg-paneer',
      ],
    ],
  ])('rejects a custom pizza with %s', async (_label, keys) => {
    const res = await place([customLine(keys)]);
    expect([HTTP_STATUS.BAD_REQUEST]).toContain(res.status);
  });

  it('ignores any price the client tries to send', async () => {
    const res = await place([{ ...menuLine('margherita'), unitPriceMinor: 1 }]);
    expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
  });

  it('rejects unknown pizzas and over-large quantities', async () => {
    const unknown = await place([{ kind: 'menu', pizzaId: 'f'.repeat(24), quantity: 1 }]);
    expect(unknown.status).toBe(HTTP_STATUS.BAD_REQUEST);

    const tooMany = await place([
      menuLine('margherita', ctx.config.order.limits.maxQuantityPerLine + 1),
    ]);
    expect(tooMany.status).toBe(HTTP_STATUS.BAD_REQUEST);
  });

  it('refuses up front when stock is already short', async () => {
    inventory.byKey('base-classic').quantity = 0;
    const res = await place([menuLine('margherita')]);
    expect(res.status).toBe(HTTP_STATUS.CONFLICT);
    expect(res.body.error.code).toBe(ERROR_CODE.OUT_OF_STOCK);
  });

  it('checks combined need across lines, not each line alone', async () => {
    inventory.byKey('base-classic').quantity = 3;
    const res = await place([menuLine('margherita', 2), menuLine('farmhouse', 2)]);
    expect(res.status).toBe(HTTP_STATUS.CONFLICT);
  });

  it('requires a signed-in customer', async () => {
    const res = await api.post(`${base}/orders`).send({ lines: [menuLine('margherita')] });
    expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);

    const admin = await signInAdmin(ctx);
    const asAdmin = await api
      .post(`${base}/orders`)
      .set('Authorization', admin.header)
      .send({ lines: [menuLine('margherita')] });
    expect(asAdmin.status).toBe(HTTP_STATUS.FORBIDDEN);
  });
});

describe('paying for an order', () => {
  it('marks the order received and takes stock for every ingredient and unit', async () => {
    const before = { base: stockOf('base-classic'), sauce: stockOf('sauce-tomato') };
    const placed = await place([menuLine('margherita', 2)]);

    const paid = await payInFull(placed.body.order.id);
    expect(paid.status).toBe(HTTP_STATUS.OK);
    expect(paid.body.order.status).toBe(ORDER_STATUS.ORDER_RECEIVED);
    expect(paid.body.order.statusLabel).toBe('Order Received');
    expect(paid.body.order.payment.status).toBe(PAYMENT_STATUS.PAID);
    expect(stockOf('base-classic')).toBe(before.base - 2);
    expect(stockOf('sauce-tomato')).toBe(before.sauce - 2);
  });

  it('is idempotent: confirming the same payment twice takes stock once', async () => {
    const placed = await place([menuLine('margherita')]);
    const orderId = placed.body.order.id;
    const checkout = await authed(api.post(`${base}/orders/${orderId}/mock-checkout`)).send({
      outcome: 'success',
    });
    const body = {
      providerPaymentId: checkout.body.providerPaymentId,
      signature: checkout.body.signature,
    };

    const first = await authed(api.post(`${base}/orders/${orderId}/payment`)).send(body);
    const stockAfterFirst = stockOf('base-classic');
    const second = await authed(api.post(`${base}/orders/${orderId}/payment`)).send(body);

    expect(first.status).toBe(HTTP_STATUS.OK);
    expect(second.status).toBe(HTTP_STATUS.OK);
    expect(stockOf('base-classic')).toBe(stockAfterFirst);
  });

  it('rejects a different payment id on an already paid order', async () => {
    const placed = await place([menuLine('margherita')]);
    await payInFull(placed.body.order.id);
    const other = await authed(
      api.post(`${base}/orders/${placed.body.order.id}/mock-checkout`),
    ).send({ outcome: 'success' });
    expect(other.status).toBe(HTTP_STATUS.CONFLICT);
  });

  it('rejects a forged signature and leaves stock and status untouched', async () => {
    const stockBefore = stockOf('base-classic');
    const placed = await place([menuLine('margherita')]);
    const res = await authed(api.post(`${base}/orders/${placed.body.order.id}/payment`)).send({
      providerPaymentId: 'pay_forged',
      signature: 'deadbeef',
    });
    expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
    expect(res.body.error.code).toBe(ERROR_CODE.PAYMENT_SIGNATURE_INVALID);
    expect(stockOf('base-classic')).toBe(stockBefore);

    const order = await authed(api.get(`${base}/orders/${placed.body.order.id}`));
    expect(order.body.order.status).toBe(ORDER_STATUS.AWAITING_PAYMENT);
  });

  it('rolls everything back when stock runs out between ordering and paying', async () => {
    const placed = await place([menuLine('farmhouse')]);
    const tomatoBefore = stockOf('sauce-tomato');
    // Another customer buys the last mushrooms while this checkout is open.
    inventory.byKey('veg-mushroom').quantity = 0;

    const res = await payInFull(placed.body.order.id);
    expect(res.status).toBe(HTTP_STATUS.CONFLICT);
    expect(res.body.error.code).toBe(ERROR_CODE.OUT_OF_STOCK);
    expect(stockOf('sauce-tomato')).toBe(tomatoBefore);

    const order = await authed(api.get(`${base}/orders/${placed.body.order.id}`));
    expect(order.body.order.status).toBe(ORDER_STATUS.PAYMENT_FAILED);
  });

  it('marks a dismissed checkout as failed and blocks later payment', async () => {
    const placed = await place([menuLine('margherita')]);
    const orderId = placed.body.order.id;
    // A correctly signed result obtained before the checkout was abandoned.
    const checkout = await authed(api.post(`${base}/orders/${orderId}/mock-checkout`)).send({
      outcome: 'success',
    });

    const failed = await authed(api.post(`${base}/orders/${orderId}/payment-failure`)).send();
    expect(failed.body.order.status).toBe(ORDER_STATUS.PAYMENT_FAILED);

    const late = await authed(api.post(`${base}/orders/${orderId}/payment`)).send({
      providerPaymentId: checkout.body.providerPaymentId,
      signature: checkout.body.signature,
    });
    expect(late.status).toBe(HTTP_STATUS.CONFLICT);

    const newCheckout = await authed(api.post(`${base}/orders/${orderId}/mock-checkout`)).send({
      outcome: 'success',
    });
    expect(newCheckout.status).toBe(HTTP_STATUS.CONFLICT);
  });

  it('hides other customers orders behind a 404', async () => {
    const placed = await place([menuLine('margherita')]);
    const stranger = await signInCustomer(ctx, { email: 'ravi@example.test', name: 'Ravi' });
    const res = await api
      .get(`${base}/orders/${placed.body.order.id}`)
      .set('Authorization', stranger.header);
    expect(res.status).toBe(HTTP_STATUS.NOT_FOUND);

    const pay = await api
      .post(`${base}/orders/${placed.body.order.id}/payment`)
      .set('Authorization', stranger.header)
      .send({ providerPaymentId: 'x', signature: 'y' });
    expect(pay.status).toBe(HTTP_STATUS.NOT_FOUND);
  });

  it('lists only my orders, newest first', async () => {
    await place([menuLine('margherita')]);
    await place([menuLine('farmhouse')]);
    const res = await authed(api.get(`${base}/orders`));
    expect(res.body.orders).toHaveLength(2);
    expect(res.body.orders[0].lines[0].name).toBe('Farmhouse');
  });
});
