import { describe, expect, it } from 'vitest';
import { EnvironmentError, parseEnv } from '../../src/config/env.js';

const validEnv = {
  MONGODB_URI: 'mongodb+srv://user:pass@cluster.example.mongodb.net/pizza',
  JWT_SECRET: 'x'.repeat(40),
  CLIENT_ORIGIN: 'http://localhost:5173, https://pizza.example.com',
  MOCK_PAYMENT_SECRET: 'mock-secret',
};

describe('parseEnv', () => {
  it('applies defaults and splits the CORS origin list', () => {
    const env = parseEnv(validEnv);
    expect(env.PORT).toBe(4000);
    expect(env.EMAIL_PROVIDER).toBe('ethereal');
    expect(env.PAYMENT_PROVIDER).toBe('mock');
    expect(env.CLIENT_ORIGIN).toEqual(['http://localhost:5173', 'https://pizza.example.com']);
  });

  it('reports every problem in one error', () => {
    expect(() => parseEnv({})).toThrow(EnvironmentError);
    try {
      parseEnv({});
    } catch (error) {
      expect(error.message).toContain('MONGODB_URI');
      expect(error.message).toContain('JWT_SECRET');
      expect(error.message).toContain('CLIENT_ORIGIN');
    }
  });

  it('rejects a JWT secret shorter than the configured minimum', () => {
    expect(() => parseEnv({ ...validEnv, JWT_SECRET: 'short' })).toThrow(/JWT_SECRET/);
  });

  it('requires SMTP settings when the smtp provider is selected', () => {
    expect(() => parseEnv({ ...validEnv, EMAIL_PROVIDER: 'smtp' })).toThrow(/SMTP_HOST/);
  });

  it('requires Razorpay keys when the razorpay provider is selected', () => {
    expect(() => parseEnv({ ...validEnv, PAYMENT_PROVIDER: 'razorpay' })).toThrow(
      /RAZORPAY_KEY_ID/,
    );
  });

  it('accepts a fully configured razorpay setup', () => {
    const env = parseEnv({
      ...validEnv,
      PAYMENT_PROVIDER: 'razorpay',
      RAZORPAY_KEY_ID: 'rzp_test_abc',
      RAZORPAY_KEY_SECRET: 'secret',
    });
    expect(env.PAYMENT_PROVIDER).toBe('razorpay');
  });

  it('treats blank values, as left by a copied .env.example, as not set', () => {
    const env = parseEnv({
      ...validEnv,
      SMTP_HOST: '',
      SMTP_PORT: '',
      RAZORPAY_KEY_ID: '  ',
      ADMIN_EMAIL: '',
    });
    expect(env.SMTP_HOST).toBeUndefined();
    expect(env.RAZORPAY_KEY_ID).toBeUndefined();
    expect(env.PORT).toBe(4000);
  });

  it('still reports a blank value that the selected provider needs', () => {
    expect(() => parseEnv({ ...validEnv, EMAIL_PROVIDER: 'smtp', SMTP_HOST: '' })).toThrow(
      /SMTP_HOST/,
    );
  });

  it('still reports a blank required value', () => {
    expect(() => parseEnv({ ...validEnv, MONGODB_URI: '' })).toThrow(/MONGODB_URI/);
  });

  it('allows the log email provider in development but never in production', () => {
    expect(parseEnv({ ...validEnv, EMAIL_PROVIDER: 'log' }).EMAIL_PROVIDER).toBe('log');
    expect(() => parseEnv({ ...validEnv, EMAIL_PROVIDER: 'log', NODE_ENV: 'production' })).toThrow(
      /must not be used in production/,
    );
  });

  it('returns a frozen object', () => {
    expect(Object.isFrozen(parseEnv(validEnv))).toBe(true);
  });
});
