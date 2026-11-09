import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import inventoryConfig from '../../config/inventory.config.js';
import inventorySeed from '../../config/inventory.seed.json' with { type: 'json' };
import menuSeed from '../../config/menu.seed.json' with { type: 'json' };
import { ERROR_CODE, HTTP_STATUS, ORDER_STATUS } from '../../src/constants/index.js';
import { InventoryItem } from '../../src/models/inventoryItem.model.js';
import { Order } from '../../src/models/order.model.js';
import { Pizza } from '../../src/models/pizza.model.js';
import { inventoryRepository } from '../../src/repositories/inventory.repository.js';
import { pizzaRepository } from '../../src/repositories/pizza.repository.js';
import { seedCatalog } from '../../src/seed/seedCatalog.js';
import { connectTestDatabase, hasTestDatabase } from '../helpers/mongo.js';
import { apiBase, signInAdmin, signInCustomer } from '../helpers/session.js';
import { createTestApp } from '../helpers/testApp.js';

const silentLogger = { info() {}, warn() {}, error() {}, debug() {} };

/**
 * These suites run the real repositories, models and MongoDB transactions. They are the
 * proof that stock and payments are atomic; the fake-backed suites cover everything else.
 */
describe.skipIf(!hasTestDatabase)('payment settlement against MongoDB', () => {
  let database;
  let ctx;
  let api;
  let base;
  let customer;

  beforeAll(async () => {
    database = await connectTestDatabase('payment_settlement');
    await Promise.all([InventoryItem.init(), Order.init(), Pizza.init()]);
  });

  afterAll(async () => {
    await database?.close();
  });

  beforeEach(async () => {
    await database.reset();
    await seedCatalog({
      inventorySeed,
      menuSeed,
      inventoryConfig,
      inventoryRepository,
      pizzaRepository,
      logger: silentLogger,
    });
    ctx = createTestApp({ useFakes: false });
    api = request(ctx.app);
    base = apiBase(ctx.config);
    customer = await signInCustomer(ctx);
  });

  const stock = async (key) => (await InventoryItem.findOne({ key })).quantity;
  const authed = (builder) => builder.set('Authorization', customer.header);

  async function placeMargherita(quantity = 1) {
    const pizza = await Pizza.findOne({ key: 'margherita' });
    const res = await authed(api.post(`${base}/orders`)).send({
      lines: [{ kind: 'menu', pizzaId: String(pizza._id), quantity }],
    });
    expect(res.status).toBe(HTTP_STATUS.CREATED);
    return res.body.order.id;
  }

  async function signedPayment(orderId) {
    const res = await authed(api.post(`${base}/orders/${orderId}/mock-checkout`)).send({
      outcome: 'success',
    });
    return { providerPaymentId: res.body.providerPaymentId, signature: res.body.signature };
  }

  it('takes stock exactly once when the same payment is confirmed concurrently', async () => {
    const before = await stock('base-classic');
    const orderId = await placeMargherita(2);
    const payment = await signedPayment(orderId);

    const results = await Promise.all(
      Array.from({ length: 4 }, () =>
        authed(api.post(`${base}/orders/${orderId}/payment`)).send(payment),
      ),
    );

    expect(results.every((res) => res.status === HTTP_STATUS.OK)).toBe(true);
    expect(await stock('base-classic')).toBe(before - 2);
    const order = await Order.findById(orderId);
    expect(order.status).toBe(ORDER_STATUS.ORDER_RECEIVED);
    expect(order.statusHistory.map((entry) => entry.status)).toEqual([
      ORDER_STATUS.AWAITING_PAYMENT,
      ORDER_STATUS.ORDER_RECEIVED,
    ]);
  });

  it('rolls back the whole payment when one ingredient sells out mid-way', async () => {
    const pizza = await Pizza.findOne({ key: 'farmhouse' });
    const placed = await authed(api.post(`${base}/orders`)).send({
      lines: [{ kind: 'menu', pizzaId: String(pizza._id), quantity: 1 }],
    });
    const orderId = placed.body.order.id;
    const payment = await signedPayment(orderId);
    const tomatoSauceBefore = await stock('sauce-tomato');

    await InventoryItem.updateOne({ key: 'veg-mushroom' }, { quantity: 0 });

    const res = await authed(api.post(`${base}/orders/${orderId}/payment`)).send(payment);
    expect(res.status).toBe(HTTP_STATUS.CONFLICT);
    expect(res.body.error.code).toBe(ERROR_CODE.OUT_OF_STOCK);
    // Items reserved before the failing one must have been rolled back with it.
    expect(await stock('sauce-tomato')).toBe(tomatoSauceBefore);
    expect(await stock('base-classic')).toBe(
      inventorySeed.items.find((item) => item.key === 'base-classic').quantity,
    );
    expect((await Order.findById(orderId)).status).toBe(ORDER_STATUS.PAYMENT_FAILED);
  });

  it('never oversells when many customers race for the last units', async () => {
    await InventoryItem.updateOne({ key: 'base-classic' }, { quantity: 3 });
    const pizza = await Pizza.findOne({ key: 'margherita' });

    const orderIds = [];
    for (let i = 0; i < 6; i += 1) {
      const placed = await authed(api.post(`${base}/orders`)).send({
        lines: [{ kind: 'menu', pizzaId: String(pizza._id), quantity: 1 }],
      });
      orderIds.push(placed.body.order.id);
    }
    // Placement only pre-checks, so lower the stock again to the contested level.
    await InventoryItem.updateOne({ key: 'base-classic' }, { quantity: 3 });

    const payments = await Promise.all(orderIds.map((id) => signedPayment(id)));
    const results = await Promise.all(
      orderIds.map((id, index) =>
        authed(api.post(`${base}/orders/${id}/payment`)).send(payments[index]),
      ),
    );

    const succeeded = results.filter((res) => res.status === HTTP_STATUS.OK).length;
    expect(succeeded).toBe(3);
    expect(await stock('base-classic')).toBe(0);
  });

  it('keeps admin stock edits and low-stock re-arming consistent', async () => {
    const admin = await signInAdmin(ctx);
    const item = await InventoryItem.findOne({ key: 'base-thin' });
    await InventoryItem.updateOne({ _id: item._id }, { quantity: 2, lastAlertedAt: new Date() });

    const res = await request(ctx.app)
      .patch(`${base}/admin/inventory/${item._id}`)
      .set('Authorization', admin.header)
      .send({ quantity: 90 });

    expect(res.status).toBe(HTTP_STATUS.OK);
    const stored = await InventoryItem.findById(item._id);
    expect(stored.quantity).toBe(90);
    expect(stored.lastAlertedAt).toBeNull();
  });
});
