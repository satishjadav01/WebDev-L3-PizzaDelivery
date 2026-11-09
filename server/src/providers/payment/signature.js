import { createHmac, timingSafeEqual } from 'node:crypto';

const SIGNATURE_ALGORITHM = 'sha256';
const SIGNATURE_ENCODING = 'hex';

/**
 * Razorpay signs `order_id|payment_id` with the key secret. The mock provider signs the
 * same way, so verification runs one code path whichever provider is configured.
 */
export function computeSignature(secret, providerOrderId, providerPaymentId) {
  return createHmac(SIGNATURE_ALGORITHM, secret)
    .update(`${providerOrderId}|${providerPaymentId}`)
    .digest(SIGNATURE_ENCODING);
}

export function verifySignature({ secret, providerOrderId, providerPaymentId, signature }) {
  if (typeof signature !== 'string') return false;
  const expected = Buffer.from(computeSignature(secret, providerOrderId, providerPaymentId));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
