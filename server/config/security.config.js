import { MINUTE_MS } from './units.js';

export default {
  bodyLimit: '100kb',
  requestIdHeader: 'x-request-id',
  cors: {
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    maxAgeSeconds: 600,
  },
  rateLimit: {
    standardHeaders: 'draft-8',
    // Per client IP. Sized for two browser tabs polling every few seconds plus normal use.
    general: { windowMs: 15 * MINUTE_MS, limit: 1_500 },
    // Credential endpoints only (login, register, reset); never session restore or polling.
    auth: { windowMs: 15 * MINUTE_MS, limit: 30 },
  },
  logRedactPaths: [
    'req.headers.authorization',
    'req.headers.cookie',
    'res.headers["set-cookie"]',
    '*.password',
    '*.token',
  ],
};
