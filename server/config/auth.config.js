import { DAY_MS, HOUR_MS, MINUTE_MS } from './units.js';

export default {
  jwt: {
    algorithm: 'HS256',
    accessTtlMs: 2 * HOUR_MS,
    issuer: 'pizza-delivery-api',
    minSecretLength: 32,
  },
  password: {
    bcryptRounds: 12,
    minLength: 8,
    maxLength: 72, // bcrypt silently truncates beyond 72 bytes
    requireDigit: true,
    requireLetter: true,
  },
  profile: {
    nameMaxLength: 80,
    emailMaxLength: 254,
  },
  admin: {
    defaultName: 'Administrator',
  },
  oneTimeTokens: {
    byteLength: 32,
    maxLength: 512,
    verifyEmailTtlMs: DAY_MS,
    resetPasswordTtlMs: HOUR_MS,
    resendCooldownMs: 2 * MINUTE_MS,
  },
};
