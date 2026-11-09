import Razorpay from 'razorpay';
import { PAYMENT_PROVIDER } from '../../constants/index.js';
import { createMockPaymentProvider } from './mock.provider.js';
import { assertPaymentProvider } from './payment.contract.js';
import { createRazorpayProvider } from './razorpay.provider.js';

const REGISTRY = Object.freeze({
  [PAYMENT_PROVIDER.MOCK]: ({ env, paymentConfig }) =>
    createMockPaymentProvider({ paymentConfig, secret: env.MOCK_PAYMENT_SECRET }),
  [PAYMENT_PROVIDER.RAZORPAY]: ({ env, logger, createClient }) =>
    createRazorpayProvider({ env, logger, createClient }),
});

/** Picks the provider named by PAYMENT_PROVIDER. Adding a provider is one registry entry. */
export function createPaymentProvider({
  env,
  paymentConfig,
  logger,
  createClient = (options) => new Razorpay(options),
}) {
  const factory = REGISTRY[env.PAYMENT_PROVIDER];
  if (!factory) {
    throw new Error(`Unsupported PAYMENT_PROVIDER "${env.PAYMENT_PROVIDER}"`);
  }
  return assertPaymentProvider(factory({ env, paymentConfig, logger, createClient }));
}
