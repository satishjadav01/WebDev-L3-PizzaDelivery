import { describe, expect, it, vi } from 'vitest';
import paymentConfig from '../../config/payment.config.js';
import { ERROR_CODE } from '../../src/constants/index.js';
import { createPaymentProvider } from '../../src/providers/payment/index.js';
import { MOCK_OUTCOME } from '../../src/providers/payment/mock.provider.js';
import { computeSignature, verifySignature } from '../../src/providers/payment/signature.js';

const silentLogger = { info: vi.fn(), error: vi.fn(), warn: vi.fn() };
const mockEnv = { PAYMENT_PROVIDER: 'mock', MOCK_PAYMENT_SECRET: 'mock-secret' };
const razorpayEnv = {
  PAYMENT_PROVIDER: 'razorpay',
  RAZORPAY_KEY_ID: 'rzp_test_key',
  RAZORPAY_KEY_SECRET: 'rzp-secret',
};

describe('signature', () => {
  it('matches only the exact order, payment and secret', () => {
    const signature = computeSignature('s', 'order_1', 'pay_1');
    const check = (overrides) =>
      verifySignature({
        secret: 's',
        providerOrderId: 'order_1',
        providerPaymentId: 'pay_1',
        signature,
        ...overrides,
      });

    expect(check({})).toBe(true);
    expect(check({ providerOrderId: 'order_2' })).toBe(false);
    expect(check({ providerPaymentId: 'pay_2' })).toBe(false);
    expect(check({ secret: 'other' })).toBe(false);
    expect(check({ signature: undefined })).toBe(false);
    expect(check({ signature: 'short' })).toBe(false);
  });
});

describe('mock payment provider', () => {
  const provider = createPaymentProvider({
    env: mockEnv,
    paymentConfig,
    logger: silentLogger,
  });

  it('creates prefixed, unique order ids and echoes amount and currency', async () => {
    const a = await provider.createOrder({ amountMinor: 1000, currency: 'INR', receipt: 'r1' });
    const b = await provider.createOrder({ amountMinor: 1000, currency: 'INR', receipt: 'r2' });
    expect(a.providerOrderId).toMatch(new RegExp(`^${paymentConfig.mock.orderIdPrefix}_`));
    expect(a.providerOrderId).not.toBe(b.providerOrderId);
    expect(a).toMatchObject({ amountMinor: 1000, currency: 'INR' });
  });

  it('produces a checkout result that verifyPayment accepts', async () => {
    const { providerOrderId } = await provider.createOrder({ amountMinor: 1, currency: 'INR' });
    const result = provider.simulateCheckout({ providerOrderId, outcome: MOCK_OUTCOME.SUCCESS });
    expect(result.success).toBe(true);
    expect(provider.verifyPayment(result)).toBe(true);
  });

  it('rejects a tampered payment id', async () => {
    const { providerOrderId } = await provider.createOrder({ amountMinor: 1, currency: 'INR' });
    const result = provider.simulateCheckout({ providerOrderId, outcome: MOCK_OUTCOME.SUCCESS });
    expect(provider.verifyPayment({ ...result, providerPaymentId: 'pay_forged' })).toBe(false);
  });

  it('returns no signed payment for a failed checkout', async () => {
    const result = provider.simulateCheckout({
      providerOrderId: 'order_x',
      outcome: MOCK_OUTCOME.FAILURE,
    });
    expect(result).toEqual({ success: false });
  });

  it('exposes only the provider name to the client', () => {
    expect(provider.describeForClient()).toEqual({ provider: 'mock' });
  });
});

describe('razorpay payment provider', () => {
  const buildProvider = (create) =>
    createPaymentProvider({
      env: razorpayEnv,
      paymentConfig,
      logger: silentLogger,
      createClient: () => ({ orders: { create } }),
    });

  it('maps the gateway order to the contract shape', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'order_rzp', amount: 5000, currency: 'INR' });
    const result = await buildProvider(create).createOrder({
      amountMinor: 5000,
      currency: 'INR',
      receipt: 'rcpt_1',
    });
    expect(create).toHaveBeenCalledWith({ amount: 5000, currency: 'INR', receipt: 'rcpt_1' });
    expect(result).toEqual({ providerOrderId: 'order_rzp', amountMinor: 5000, currency: 'INR' });
  });

  it('wraps gateway failures in a typed upstream error', async () => {
    const create = vi.fn().mockRejectedValue(new Error('boom'));
    await expect(
      buildProvider(create).createOrder({ amountMinor: 1, currency: 'INR' }),
    ).rejects.toMatchObject({ code: ERROR_CODE.PAYMENT_GATEWAY_ERROR });
  });

  it('verifies signatures with the key secret and exposes the public key id', () => {
    const provider = buildProvider(vi.fn());
    const signature = computeSignature('rzp-secret', 'order_1', 'pay_1');
    expect(
      provider.verifyPayment({ providerOrderId: 'order_1', providerPaymentId: 'pay_1', signature }),
    ).toBe(true);
    expect(provider.describeForClient()).toEqual({
      provider: 'razorpay',
      keyId: 'rzp_test_key',
    });
  });
});

describe('createPaymentProvider', () => {
  it('rejects an unknown provider name', () => {
    expect(() =>
      createPaymentProvider({ env: { PAYMENT_PROVIDER: 'stripe' }, paymentConfig }),
    ).toThrow(/Unsupported PAYMENT_PROVIDER/);
  });
});
