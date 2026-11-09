import { ERROR_CODE, PAYMENT_PROVIDER } from '../../constants/index.js';
import { UpstreamError } from '../../utils/errors/index.js';
import { verifySignature } from './signature.js';

/** Razorpay Orders API. Works with test or live keys; only the key pair differs. */
export function createRazorpayProvider({ env, logger, createClient }) {
  const client = createClient({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET });

  return {
    async createOrder({ amountMinor, currency, receipt }) {
      try {
        const order = await client.orders.create({ amount: amountMinor, currency, receipt });
        return { providerOrderId: order.id, amountMinor: order.amount, currency: order.currency };
      } catch (cause) {
        logger.error({ err: cause, receipt }, 'razorpay order creation failed');
        throw new UpstreamError(
          'Payment gateway is unavailable, please try again',
          ERROR_CODE.PAYMENT_GATEWAY_ERROR,
          cause,
        );
      }
    },

    verifyPayment({ providerOrderId, providerPaymentId, signature }) {
      return verifySignature({
        secret: env.RAZORPAY_KEY_SECRET,
        providerOrderId,
        providerPaymentId,
        signature,
      });
    },

    describeForClient() {
      return { provider: PAYMENT_PROVIDER.RAZORPAY, keyId: env.RAZORPAY_KEY_ID };
    },
  };
}
