import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { HTTP_STATUS } from '../../src/constants/index.js';
import { apiBase, signInCustomer } from '../helpers/session.js';
import { createTestApp } from '../helpers/testApp.js';

let ctx;
let api;
let base;

beforeEach(() => {
  ctx = createTestApp();
  api = request(ctx.app);
  base = apiBase(ctx.config);
});

describe('rate limiting', () => {
  it('leaves room for a full demo: two tabs polling for a whole window plus session restores', async () => {
    const customer = await signInCustomer(ctx);
    const { windowMs, limit } = ctx.config.security.rateLimit.general;
    const pollsPerTab = Math.ceil(windowMs / ctx.config.app.clientPolling.orderStatusIntervalMs);
    const tabs = 2;
    const sessionRestores = 25;

    // The scenario itself must fit the configured budget, or the config is wrong.
    expect(tabs * pollsPerTab + sessionRestores).toBeLessThan(limit);

    const statuses = [];
    for (let i = 0; i < sessionRestores; i += 1) {
      statuses.push(
        (await api.get(`${base}/auth/me`).set('Authorization', customer.header)).status,
      );
    }
    for (let i = 0; i < tabs * pollsPerTab; i += 1) {
      statuses.push((await api.get(`${base}/orders`).set('Authorization', customer.header)).status);
    }
    expect(statuses.filter((status) => status === HTTP_STATUS.TOO_MANY_REQUESTS)).toHaveLength(0);
  });

  it('still throttles credential guessing on login', async () => {
    const { limit } = ctx.config.security.rateLimit.auth;
    const attempt = () =>
      api.post(`${base}/auth/login`).send({ email: 'x@example.test', password: 'Wrong-pass-1' });

    for (let i = 0; i < limit; i += 1) {
      expect((await attempt()).status).toBe(HTTP_STATUS.UNAUTHORIZED);
    }
    const blocked = await attempt();
    expect(blocked.status).toBe(HTTP_STATUS.TOO_MANY_REQUESTS);
    expect(blocked.body.error.code).toBe('RATE_LIMITED');
  });

  it('does not count session restore against the credential limit', async () => {
    const customer = await signInCustomer(ctx);
    const { limit } = ctx.config.security.rateLimit.auth;
    for (let i = 0; i < limit + 5; i += 1) {
      const res = await api.get(`${base}/auth/me`).set('Authorization', customer.header);
      expect(res.status).toBe(HTTP_STATUS.OK);
    }
  });
});
