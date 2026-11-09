import { SECOND_MS } from './units.js';

export default {
  fromName: 'Pizza Delivery',
  transport: {
    connectionTimeoutMs: 10 * SECOND_MS,
    greetingTimeoutMs: 10 * SECOND_MS,
    socketTimeoutMs: 20 * SECOND_MS,
    // Hard cap on one whole send, including creating the throwaway Ethereal inbox, so a
    // blocked network fails fast instead of hanging the request that triggered the email.
    sendTimeoutMs: 8 * SECOND_MS,
  },
  // Paths appended to CLIENT_BASE_URL when building links inside emails.
  links: {
    verifyEmail: '/verify-email',
    resetPassword: '/reset-password',
    adminInventory: '/admin/inventory',
  },
};
