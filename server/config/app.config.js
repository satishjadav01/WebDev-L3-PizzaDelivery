import { SECOND_MS } from './units.js';

export default {
  name: 'pizza-delivery-api',
  server: {
    defaultPort: 4000,
    shutdownTimeoutMs: 10 * SECOND_MS,
  },
  api: {
    prefix: '/api',
    version: 'v1',
  },
  database: {
    serverSelectionTimeoutMS: 10 * SECOND_MS,
    maxPoolSize: 10,
    connectAttempts: 3,
    retryDelayMs: 2 * SECOND_MS,
  },
  pagination: {
    defaultPageSize: 20,
    maxPageSize: 100,
  },
  // Single source of truth for how often clients re-check order status.
  clientPolling: {
    orderStatusIntervalMs: 5 * SECOND_MS,
  },
};
