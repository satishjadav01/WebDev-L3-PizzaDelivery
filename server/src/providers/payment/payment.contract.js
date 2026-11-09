import { assertImplements } from '../../utils/contract.js';

/**
 * Payment provider contract. Amounts are integers in minor units (paise).
 *
 * createOrder({ amountMinor, currency, receipt })
 *   -> Promise<{ providerOrderId: string, amountMinor: number, currency: string }>
 *   Rejects with an UpstreamError (PAYMENT_GATEWAY_ERROR) when the gateway fails.
 *
 * verifyPayment({ providerOrderId, providerPaymentId, signature }) -> boolean
 *   True only when the gateway signature matches. Never throws on a bad signature.
 *
 * describeForClient() -> { provider: string, keyId?: string }
 *   Public values the browser needs to open the right checkout. Never secrets.
 *
 * Optional: simulateCheckout({ providerOrderId, outcome }) exists on the mock provider only.
 */
export const PAYMENT_PROVIDER_METHODS = Object.freeze([
  'createOrder',
  'verifyPayment',
  'describeForClient',
]);

export function assertPaymentProvider(provider) {
  return assertImplements(provider, PAYMENT_PROVIDER_METHODS, 'Payment provider');
}
