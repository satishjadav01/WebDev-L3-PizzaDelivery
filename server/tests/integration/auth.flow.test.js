import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { ERROR_CODE, HTTP_STATUS, ROLE } from '../../src/constants/index.js';
import { createTestApp } from '../helpers/testApp.js';

const customer = { name: 'Asha Rao', email: 'asha@example.test', password: 'Sup3rSecret!' };
const adminLogin = { email: 'admin@example.test', password: 'Admin-test-pass-1' };

let ctx;
let api;
let base;

beforeEach(() => {
  ctx = createTestApp();
  const { prefix, version } = ctx.config.app.api;
  base = `${prefix}/${version}`;
  api = request(ctx.app);
});

const register = (body = customer) => api.post(`${base}/auth/register`).send(body);
const login = (body = customer) =>
  api.post(`${base}/auth/login`).send({ email: body.email, password: body.password });

async function registerAndVerify() {
  await register();
  const token = ctx.fakes.emailProvider.lastTokenFor(customer.email);
  await api.post(`${base}/auth/verify-email`).send({ token });
}

describe('registration and email verification', () => {
  it('creates an unverified account and mails a verification link', async () => {
    const res = await register();
    expect(res.status).toBe(HTTP_STATUS.CREATED);
    expect(res.body.user).toMatchObject({
      email: customer.email,
      role: ROLE.CUSTOMER,
      isEmailVerified: false,
    });
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(ctx.fakes.emailProvider.lastTokenFor(customer.email)).toBeTruthy();
  });

  it('stores a password hash, never the password', async () => {
    await register();
    const stored = ctx.fakes.repositories.user.users[0];
    expect(stored.passwordHash).not.toBe(customer.password);
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$/);
  });

  it('rejects a duplicate email with 409', async () => {
    await register();
    const res = await register();
    expect(res.status).toBe(HTTP_STATUS.CONFLICT);
  });

  it.each([
    ['too short', 'a1'],
    ['no number', 'onlyletters'],
    ['no letter', '12345678'],
  ])('rejects a password that is %s', async (_label, password) => {
    const res = await register({ ...customer, password });
    expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
    expect(res.body.error.code).toBe(ERROR_CODE.VALIDATION_FAILED);
  });

  it('rejects unknown fields so role cannot be smuggled in', async () => {
    const res = await register({ ...customer, role: ROLE.ADMIN });
    expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
  });

  it('verifies the email once; the link cannot be reused', async () => {
    await register();
    const token = ctx.fakes.emailProvider.lastTokenFor(customer.email);

    const first = await api.post(`${base}/auth/verify-email`).send({ token });
    expect(first.status).toBe(HTTP_STATUS.OK);
    expect(first.body.user.isEmailVerified).toBe(true);

    const second = await api.post(`${base}/auth/verify-email`).send({ token });
    expect(second.status).toBe(HTTP_STATUS.BAD_REQUEST);
    expect(second.body.error.code).toBe(ERROR_CODE.INVALID_TOKEN);
  });

  it('rejects an expired verification link', async () => {
    await register();
    const token = ctx.fakes.emailProvider.lastTokenFor(customer.email);
    ctx.clock.advance(ctx.config.auth.oneTimeTokens.verifyEmailTtlMs + 1);

    const res = await api.post(`${base}/auth/verify-email`).send({ token });
    expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
  });

  it('still creates the account when the mail server is down', async () => {
    ctx.fakes.emailProvider.sendMail.mockRejectedValueOnce(new Error('smtp down'));
    const res = await register();
    expect(res.status).toBe(HTTP_STATUS.CREATED);
    expect(res.body.verificationEmailSent).toBe(false);
  });

  it('lets the user resend immediately when the first email never left', async () => {
    ctx.fakes.emailProvider.sendMail.mockRejectedValueOnce(new Error('network down'));
    const registered = await register();
    expect(registered.body.verificationEmailSent).toBe(false);
    expect(ctx.fakes.emailProvider.outbox).toHaveLength(0);

    // No cooldown wait: the failed attempt must not count as a delivered link.
    await api.post(`${base}/auth/resend-verification`).send({ email: customer.email });
    expect(ctx.fakes.emailProvider.outbox).toHaveLength(1);

    const token = ctx.fakes.emailProvider.lastTokenFor(customer.email);
    const verified = await api.post(`${base}/auth/verify-email`).send({ token });
    expect(verified.status).toBe(HTTP_STATUS.OK);
  });

  it('honours the resend cooldown, then mails a fresh link', async () => {
    await register();
    const sent = () => ctx.fakes.emailProvider.outbox.length;
    expect(sent()).toBe(1);

    await api.post(`${base}/auth/resend-verification`).send({ email: customer.email });
    expect(sent()).toBe(1);

    ctx.clock.advance(ctx.config.auth.oneTimeTokens.resendCooldownMs + 1);
    await api.post(`${base}/auth/resend-verification`).send({ email: customer.email });
    expect(sent()).toBe(2);
  });
});

describe('customer login', () => {
  it('blocks sign-in until the email is verified', async () => {
    await register();
    const res = await login();
    expect(res.status).toBe(HTTP_STATUS.FORBIDDEN);
    expect(res.body.error.code).toBe(ERROR_CODE.EMAIL_NOT_VERIFIED);
  });

  it('issues a bearer token that opens /auth/me', async () => {
    await registerAndVerify();
    const res = await login();
    expect(res.status).toBe(HTTP_STATUS.OK);
    expect(res.body.tokenType).toBe('Bearer');

    const me = await api
      .get(`${base}/auth/me`)
      .set('Authorization', `Bearer ${res.body.accessToken}`);
    expect(me.status).toBe(HTTP_STATUS.OK);
    expect(me.body.user.email).toBe(customer.email);
  });

  it('gives the same answer for a wrong password and an unknown email', async () => {
    await registerAndVerify();
    const wrongPassword = await login({ ...customer, password: 'Wrong-pass-1' });
    const unknownEmail = await login({ email: 'nobody@example.test', password: 'Wrong-pass-1' });

    expect(wrongPassword.status).toBe(HTTP_STATUS.UNAUTHORIZED);
    expect(unknownEmail.status).toBe(HTTP_STATUS.UNAUTHORIZED);
    expect(wrongPassword.body.error.message).toBe(unknownEmail.body.error.message);
  });

  it('rejects operator objects in place of strings', async () => {
    const res = await api
      .post(`${base}/auth/login`)
      .send({ email: { $gt: '' }, password: { $gt: '' } });
    expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
  });

  it('refuses requests without or with a forged token', async () => {
    const none = await api.get(`${base}/auth/me`);
    expect(none.status).toBe(HTTP_STATUS.UNAUTHORIZED);

    const forged = await api.get(`${base}/auth/me`).set('Authorization', 'Bearer not.a.jwt');
    expect(forged.status).toBe(HTTP_STATUS.UNAUTHORIZED);
  });
});

describe('password reset', () => {
  beforeEach(registerAndVerify);

  it('answers 202 for unknown emails and sends nothing', async () => {
    const before = ctx.fakes.emailProvider.outbox.length;
    const res = await api
      .post(`${base}/auth/forgot-password`)
      .send({ email: 'nobody@example.test' });
    expect(res.status).toBe(HTTP_STATUS.ACCEPTED);
    expect(ctx.fakes.emailProvider.outbox.length).toBe(before);
  });

  it('resets the password once and invalidates the old one', async () => {
    await api.post(`${base}/auth/forgot-password`).send({ email: customer.email });
    const token = ctx.fakes.emailProvider.lastTokenFor(customer.email);
    const newPassword = 'Brand-new-pass-9';

    const reset = await api
      .post(`${base}/auth/reset-password`)
      .send({ token, password: newPassword });
    expect(reset.status).toBe(HTTP_STATUS.NO_CONTENT);

    expect((await login()).status).toBe(HTTP_STATUS.UNAUTHORIZED);
    expect((await login({ ...customer, password: newPassword })).status).toBe(HTTP_STATUS.OK);

    const reuse = await api
      .post(`${base}/auth/reset-password`)
      .send({ token, password: newPassword });
    expect(reuse.status).toBe(HTTP_STATUS.BAD_REQUEST);
  });

  it('enforces the password policy on the new password', async () => {
    await api.post(`${base}/auth/forgot-password`).send({ email: customer.email });
    const token = ctx.fakes.emailProvider.lastTokenFor(customer.email);
    const res = await api.post(`${base}/auth/reset-password`).send({ token, password: 'weak' });
    expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
  });
});

describe('admin login', () => {
  beforeEach(async () => {
    await ctx.container.services.auth.provisionAdmin(adminLogin);
  });

  it('signs an admin in through the admin endpoint only', async () => {
    const res = await api.post(`${base}/admin/auth/login`).send(adminLogin);
    expect(res.status).toBe(HTTP_STATUS.OK);
    expect(res.body.user.role).toBe(ROLE.ADMIN);

    const viaCustomerEndpoint = await login(adminLogin);
    expect(viaCustomerEndpoint.status).toBe(HTTP_STATUS.UNAUTHORIZED);
  });

  it('does not let a customer use the admin endpoint', async () => {
    await registerAndVerify();
    const res = await api
      .post(`${base}/admin/auth/login`)
      .send({ email: customer.email, password: customer.password });
    expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);
  });

  it('provisions the admin only once', async () => {
    const again = await ctx.container.services.auth.provisionAdmin(adminLogin);
    expect(again.created).toBe(false);
    expect(ctx.fakes.repositories.user.users.filter((u) => u.role === ROLE.ADMIN)).toHaveLength(1);
  });
});
