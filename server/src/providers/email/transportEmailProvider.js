import { ERROR_CODE } from '../../constants/index.js';
import { UpstreamError } from '../../utils/errors/index.js';
import { withTimeout } from '../../utils/timeout.js';

/**
 * Shared behaviour for providers that send through a nodemailer transport. Concrete
 * providers only say how to obtain the transport and the sender address.
 */
export function createTransportEmailProvider({
  resolveTransport,
  resolveFrom,
  resolvePreviewUrl,
  sendTimeoutMs,
  logger,
}) {
  return {
    async sendMail({ to, subject, html, text }) {
      try {
        const info = await withTimeout(
          (async () => {
            const transport = await resolveTransport();
            const from = await resolveFrom();
            return transport.sendMail({ from, to, subject, html, text });
          })(),
          sendTimeoutMs,
          `Sending email timed out after ${sendTimeoutMs}ms. Check the network or EMAIL_PROVIDER.`,
        );
        const previewUrl = resolvePreviewUrl?.(info) || undefined;
        logger.info({ to, subject, messageId: info.messageId, previewUrl }, 'email sent');
        return { messageId: info.messageId, previewUrl };
      } catch (cause) {
        logger.error({ err: cause, to, subject }, 'email delivery failed');
        throw new UpstreamError(
          'Email could not be delivered',
          ERROR_CODE.EMAIL_DELIVERY_FAILED,
          cause,
        );
      }
    },
  };
}

export function formatSender(name, address) {
  return `"${name}" <${address}>`;
}
