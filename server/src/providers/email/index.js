import nodemailer from 'nodemailer';
import { EMAIL_PROVIDER } from '../../constants/index.js';
import { assertEmailProvider } from './email.contract.js';
import { createEtherealProvider } from './ethereal.provider.js';
import { createLogEmailProvider } from './log.provider.js';
import { createSmtpProvider } from './smtp.provider.js';

const REGISTRY = Object.freeze({
  [EMAIL_PROVIDER.ETHEREAL]: createEtherealProvider,
  [EMAIL_PROVIDER.SMTP]: createSmtpProvider,
  [EMAIL_PROVIDER.LOG]: createLogEmailProvider,
});

/** Picks the provider named by EMAIL_PROVIDER. Adding a provider is one registry entry. */
export function createEmailProvider({ env, mailConfig, logger, mailer = nodemailer }) {
  const factory = REGISTRY[env.EMAIL_PROVIDER];
  if (!factory) {
    throw new Error(`Unsupported EMAIL_PROVIDER "${env.EMAIL_PROVIDER}"`);
  }
  return assertEmailProvider(factory({ env, mailConfig, nodemailer: mailer, logger }));
}
