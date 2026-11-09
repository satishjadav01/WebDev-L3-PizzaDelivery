import { randomBytes } from 'node:crypto';
import { PAYMENT_PROVIDER } from '../../constants/index.js';
import { computeSignature, verifySignature } from './signature.js';

export const MOCK_OUTCOME = Object.freeze({ SUCCESS: 'success', FAILURE: 'failure' });

/**
 * Local stand-in for Razorpay so the full order flow runs without gateway keys. The fake
 * checkout in the client calls simulateCheckout and receives a correctly signed result,
 * exactly like Razorpay's checkout callback.
 */
export function createMockPaymentProvider({ paymentConfig, secret }) {
  const { orderIdPrefix, paymentIdPrefix, idByteLength } = paymentConfig.mock;
  const newId = (prefix) => `${prefix}_${randomBytes(idByteLength).toString('hex')}`;

  return {
    async createOrder({ amountMinor, currency }) {
      return { providerOrderId: newId(orderIdPrefix), amountMinor, currency };
    },

    verifyPayment({ providerOrderId, providerPaymentId, signature }) {
      return verifySignature({ secret, providerOrderId, providerPaymentId, signature });
    },

    describeForClient() {
      return { provider: PAYMENT_PROVIDER.MOCK };
    },

    simulateCheckout({ providerOrderId, outcome }) {
      if (outcome !== MOCK_OUTCOME.SUCCESS) {
        return { success: false };
      }
      const providerPaymentId = newId(paymentIdPrefix);
      return {
        success: true,
        providerOrderId,
        providerPaymentId,
        signature: computeSignature(secret, providerOrderId, providerPaymentId),
      };
    },
  };
}
