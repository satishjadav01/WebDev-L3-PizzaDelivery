import { createTransportEmailProvider, formatSender } from './transportEmailProvider.js';

/**
 * Sends to Ethereal's fake inbox: nothing reaches a real mailbox, and every message gets
 * a preview URL (logged) to open in the browser. A throwaway account is created on first use.
 */
export function createEtherealProvider({ mailConfig, nodemailer, logger }) {
  let accountPromise;
  const getAccount = () => {
    accountPromise ??= nodemailer
      .createTestAccount()
      .then((account) => ({
        account,
        transport: nodemailer.createTransport({
          host: account.smtp.host,
          port: account.smtp.port,
          secure: account.smtp.secure,
          auth: { user: account.user, pass: account.pass },
          connectionTimeout: mailConfig.transport.connectionTimeoutMs,
          greetingTimeout: mailConfig.transport.greetingTimeoutMs,
          socketTimeout: mailConfig.transport.socketTimeoutMs,
        }),
      }))
      .catch((error) => {
        // Do not cache a failure: the network may come back, and the next send should retry.
        accountPromise = undefined;
        throw error;
      });
    return accountPromise;
  };

  return createTransportEmailProvider({
    resolveTransport: async () => (await getAccount()).transport,
    resolveFrom: async () => formatSender(mailConfig.fromName, (await getAccount()).account.user),
    resolvePreviewUrl: (info) => nodemailer.getTestMessageUrl(info),
    sendTimeoutMs: mailConfig.transport.sendTimeoutMs,
    logger,
  });
}
