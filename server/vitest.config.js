import { defineConfig } from 'vitest/config';

// Minimal valid environment so config validation passes without a real .env.
const TEST_ENV = {
  NODE_ENV: 'test',
  LOG_LEVEL: 'silent',
  MONGODB_URI: 'mongodb://127.0.0.1:27017/pizza-test',
  JWT_SECRET: 'test-only-secret-that-is-long-enough-for-validation',
  CLIENT_ORIGIN: 'http://localhost:5173',
  EMAIL_PROVIDER: 'ethereal',
  PAYMENT_PROVIDER: 'mock',
  MOCK_PAYMENT_SECRET: 'test-only-mock-payment-secret',
  ADMIN_EMAIL: 'admin@example.test',
  ADMIN_PASSWORD: 'Admin-test-pass-1',
};

export default defineConfig({
  test: {
    environment: 'node',
    env: TEST_ENV,
    include: ['tests/**/*.test.js'],
    hookTimeout: 120_000,
    testTimeout: 30_000,
  },
});
