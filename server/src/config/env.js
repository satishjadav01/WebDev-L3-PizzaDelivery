import { z } from 'zod';
import { envSchema } from './env.schema.js';

export class EnvironmentError extends Error {
  constructor(details) {
    super(`Invalid environment configuration:\n${details}`);
    this.name = 'EnvironmentError';
  }
}

/**
 * A line like `SMTP_HOST=` in a .env file means "not set yet", so blank values are dropped
 * before validation. Otherwise copying .env.example verbatim would fail on every optional key.
 */
function withoutBlankValues(source) {
  return Object.fromEntries(
    Object.entries(source).filter(([, value]) => typeof value !== 'string' || value.trim() !== ''),
  );
}

/** Validates a raw env object. Throws one readable error listing every problem. */
export function parseEnv(source = process.env) {
  const result = envSchema.safeParse(withoutBlankValues(source));
  if (!result.success) {
    throw new EnvironmentError(z.prettifyError(result.error));
  }
  return Object.freeze(result.data);
}
