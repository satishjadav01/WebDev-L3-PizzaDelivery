import { z } from 'zod';
import appConfig from '../../config/app.config.js';
import authConfig from '../../config/auth.config.js';
import {
  EMAIL_PROVIDER,
  LOG_LEVEL,
  MAX_TCP_PORT,
  NODE_ENV,
  PAYMENT_PROVIDER,
} from '../constants/index.js';

const nonEmpty = z.string().trim().min(1);

const baseSchema = z.object({
  NODE_ENV: z.enum(Object.values(NODE_ENV)).default(NODE_ENV.DEVELOPMENT),
  PORT: z.coerce.number().int().positive().max(MAX_TCP_PORT).default(appConfig.server.defaultPort),
  LOG_LEVEL: z.enum(Object.values(LOG_LEVEL)).default(LOG_LEVEL.INFO),
  // Human-readable colourised logs for local development; leave off in production.
  LOG_PRETTY: z.stringbool().default(false),

  MONGODB_URI: z
    .string()
    .regex(/^mongodb(\+srv)?:\/\//, 'must be a mongodb:// or mongodb+srv:// URI'),
  JWT_SECRET: z.string().min(authConfig.jwt.minSecretLength),

  // Comma separated list of browser origins allowed by CORS.
  CLIENT_ORIGIN: nonEmpty.transform((value) =>
    value
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  ),
  // Base URL used when building links inside emails.
  CLIENT_BASE_URL: z.url().optional(),

  EMAIL_PROVIDER: z.enum(Object.values(EMAIL_PROVIDER)).default(EMAIL_PROVIDER.ETHEREAL),
  EMAIL_FROM_ADDRESS: z.email().optional(),
  SMTP_HOST: nonEmpty.optional(),
  SMTP_PORT: z.coerce.number().int().positive().max(MAX_TCP_PORT).optional(),
  SMTP_SECURE: z.stringbool().default(false),
  SMTP_USER: nonEmpty.optional(),
  SMTP_PASS: nonEmpty.optional(),

  PAYMENT_PROVIDER: z.enum(Object.values(PAYMENT_PROVIDER)).default(PAYMENT_PROVIDER.MOCK),
  MOCK_PAYMENT_SECRET: nonEmpty.optional(),
  RAZORPAY_KEY_ID: nonEmpty.optional(),
  RAZORPAY_KEY_SECRET: nonEmpty.optional(),

  ADMIN_EMAIL: z.email().optional(),
  ADMIN_PASSWORD: nonEmpty.optional(),
});

// Which variables a selected provider needs, kept as data so adding a provider is one entry.
const REQUIRED_BY_SELECTION = [
  {
    when: (env) => env.EMAIL_PROVIDER === EMAIL_PROVIDER.SMTP,
    vars: ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM_ADDRESS'],
  },
  {
    when: (env) => env.PAYMENT_PROVIDER === PAYMENT_PROVIDER.MOCK,
    vars: ['MOCK_PAYMENT_SECRET'],
  },
  {
    when: (env) => env.PAYMENT_PROVIDER === PAYMENT_PROVIDER.RAZORPAY,
    vars: ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET'],
  },
];

export const envSchema = baseSchema.superRefine((env, ctx) => {
  if (env.EMAIL_PROVIDER === EMAIL_PROVIDER.LOG && env.NODE_ENV === NODE_ENV.PRODUCTION) {
    ctx.addIssue({
      code: 'custom',
      path: ['EMAIL_PROVIDER'],
      message: 'the log provider sends nothing and must not be used in production',
    });
  }
  for (const { when, vars } of REQUIRED_BY_SELECTION) {
    if (!when(env)) continue;
    for (const name of vars) {
      if (env[name] === undefined) {
        ctx.addIssue({
          code: 'custom',
          path: [name],
          message: 'required for the selected provider',
        });
      }
    }
  }
});
