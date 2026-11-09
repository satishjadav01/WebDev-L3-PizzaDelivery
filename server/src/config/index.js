import appConfig from '../../config/app.config.js';
import authConfig from '../../config/auth.config.js';
import cronConfig from '../../config/cron.config.js';
import inventoryConfig from '../../config/inventory.config.js';
import mailConfig from '../../config/mail.config.js';
import orderConfig from '../../config/order.config.js';
import paymentConfig from '../../config/payment.config.js';
import securityConfig from '../../config/security.config.js';
import { NODE_ENV } from '../constants/index.js';
import { deepMerge } from '../utils/merge.js';
import { parseEnv } from './env.js';

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

/**
 * Builds the immutable application config from an env source. Pure, so tests can call it.
 * `overrides` patches the file-based tunables (never env), e.g. cheaper bcrypt rounds in tests.
 */
export function buildConfig(source = process.env, overrides = {}) {
  const env = parseEnv(source);
  const tunables = {
    app: structuredClone(appConfig),
    auth: structuredClone(authConfig),
    security: structuredClone(securityConfig),
    inventory: structuredClone(inventoryConfig),
    order: structuredClone(orderConfig),
    mail: structuredClone(mailConfig),
    payment: structuredClone(paymentConfig),
    cron: structuredClone(cronConfig),
  };
  return deepFreeze({
    env,
    isProduction: env.NODE_ENV === NODE_ENV.PRODUCTION,
    ...deepMerge(tunables, overrides),
  });
}
