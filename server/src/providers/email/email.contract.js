import { assertImplements } from '../../utils/contract.js';

/**
 * Email provider contract.
 *
 * sendMail({ to, subject, html, text }) -> Promise<{ messageId: string, previewUrl?: string }>
 *   Rejects with an UpstreamError (EMAIL_DELIVERY_FAILED) when delivery fails.
 */
export const EMAIL_PROVIDER_METHODS = Object.freeze(['sendMail']);

export function assertEmailProvider(provider) {
  return assertImplements(provider, EMAIL_PROVIDER_METHODS, 'Email provider');
}
