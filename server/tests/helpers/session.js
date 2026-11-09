import request from 'supertest';

const DEFAULT_PASSWORD = 'Sup3rSecret!';
const ADMIN_CREDENTIALS = { email: 'admin@example.test', password: 'Admin-test-pass-1' };

export function apiBase(config) {
  return `${config.app.api.prefix}/${config.app.api.version}`;
}

/** Registers, verifies and signs in a customer; returns a ready-to-use bearer header. */
export async function signInCustomer(ctx, { email = 'asha@example.test', name = 'Asha Rao' } = {}) {
  const api = request(ctx.app);
  const base = apiBase(ctx.config);
  await api.post(`${base}/auth/register`).send({ name, email, password: DEFAULT_PASSWORD });
  const token = ctx.fakes.emailProvider.lastTokenFor(email);
  await api.post(`${base}/auth/verify-email`).send({ token });
  const res = await api.post(`${base}/auth/login`).send({ email, password: DEFAULT_PASSWORD });
  return { header: `Bearer ${res.body.accessToken}`, user: res.body.user };
}

export async function signInAdmin(ctx) {
  await ctx.container.services.auth.provisionAdmin(ADMIN_CREDENTIALS);
  const res = await request(ctx.app)
    .post(`${apiBase(ctx.config)}/admin/auth/login`)
    .send(ADMIN_CREDENTIALS);
  return { header: `Bearer ${res.body.accessToken}` };
}
