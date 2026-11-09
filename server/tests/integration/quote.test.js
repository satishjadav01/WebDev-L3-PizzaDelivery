import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { ERROR_CODE, HTTP_STATUS } from '../../src/constants/index.js';
import { apiBase, signInCustomer } from '../helpers/session.js';
import { createTestApp } from '../helpers/testApp.js';

let ctx;
let api;
let base;
let customer;

beforeEach(async () => {
  ctx = createTestApp();
  api = request(ctx.app);
  base = apiBase(ctx.config);
  customer = await signInCustomer(ctx);
});

const quote = (lines) =>
  api.post(`${base}/orders/quote`).set('Authorization', customer.header).send({ lines });
const inventory = () => ctx.fakes.repositories.inventory;
const customKeys = ['base-thin', 'sauce-pesto', 'cheese-parmesan', 'veg-onion'];
const customLine = (keys = customKeys) => ({
  kind: 'custom',
  itemIds: keys.map((key) => inventory().byKey(key)._id),
  quantity: 1,
});

describe('POST /orders/quote', () => {
  it('prices a custom pizza from the database without creating an order', async () => {
    const res = await quote([customLine()]);
    const expected =
      ctx.config.order.pricing.customPizzaPreparationFeeMinor +
      customKeys.reduce((sum, key) => sum + inventory().byKey(key).priceMinor, 0);

    expect(res.status).toBe(HTTP_STATUS.OK);
    expect(res.body.quote.amountMinor).toBe(expected);
    expect(res.body.quote.currency).toBe(ctx.config.order.currency.code);
    expect(res.body.quote.lines[0].ingredients.map((i) => i.name)).toContain('Thin Crust');
    expect(ctx.fakes.repositories.order.orders).toHaveLength(0);
  });

  it('matches what placing the same cart would charge', async () => {
    const pizza = ctx.fakes.repositories.pizza.byKey('farmhouse');
    const lines = [{ kind: 'menu', pizzaId: pizza._id, quantity: 2 }];
    const quoted = await quote(lines);
    const placed = await api
      .post(`${base}/orders`)
      .set('Authorization', customer.header)
      .send({ lines });
    expect(placed.body.order.amountMinor).toBe(quoted.body.quote.amountMinor);
  });

  it('reports shortages and invalid selections the same way ordering does', async () => {
    inventory().byKey('base-thin').quantity = 0;
    const soldOut = await quote([customLine()]);
    expect(soldOut.status).toBe(HTTP_STATUS.CONFLICT);
    expect(soldOut.body.error.code).toBe(ERROR_CODE.OUT_OF_STOCK);

    const incomplete = await quote([customLine(['base-classic'])]);
    expect(incomplete.status).toBe(HTTP_STATUS.BAD_REQUEST);
  });

  it('requires a signed-in customer', async () => {
    const res = await api.post(`${base}/orders/quote`).send({ lines: [customLine()] });
    expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);
  });
});

describe('GET /meta/client-config', () => {
  it('exposes the password rules and fee but never the hashing cost', async () => {
    const res = await api.get(`${base}/meta/client-config`);
    expect(res.body.passwordPolicy).toEqual({
      minLength: ctx.config.auth.password.minLength,
      maxLength: ctx.config.auth.password.maxLength,
      requireDigit: true,
      requireLetter: true,
    });
    expect(JSON.stringify(res.body)).not.toMatch(/bcrypt/i);
    expect(res.body.pricing.customPizzaPreparationFeeMinor).toBe(
      ctx.config.order.pricing.customPizzaPreparationFeeMinor,
    );
  });
});
