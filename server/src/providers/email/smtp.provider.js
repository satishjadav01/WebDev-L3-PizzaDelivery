import { createTransportEmailProvider, formatSender } from './transportEmailProvider.js';

/** Sends through the SMTP server named in the environment (Gmail, SES, Mailgun, ...). */
export function createSmtpProvider({ env, mailConfig, nodemailer, logger }) {
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    connectionTimeout: mailConfig.transport.connectionTimeoutMs,
    greetingTimeout: mailConfig.transport.greetingTimeoutMs,
    socketTimeout: mailConfig.transport.socketTimeoutMs,
  });
  const from = formatSender(mailConfig.fromName, env.EMAIL_FROM_ADDRESS);

  return createTransportEmailProvider({
    resolveTransport: () => transport,
    resolveFrom: () => from,
    sendTimeoutMs: mailConfig.transport.sendTimeoutMs,
    logger,
  });
}
