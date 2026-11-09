import { STORAGE_KEY } from '../config/constants.js';
import { safeStorage } from './safeStorage.js';

const listeners = new Set();

/**
 * The signed-in session lives in sessionStorage: it is per tab, so an admin signing in
 * on one tab never replaces a customer's session on another, and it ends with the tab.
 * The trade-off is that a closed tab means signing in again.
 */
export const sessionStore = {
  read: () => safeStorage.read(STORAGE_KEY.SESSION),

  write(session) {
    safeStorage.write(STORAGE_KEY.SESSION, session);
  },

  /** Clears the session and tells subscribers (the auth context) it ended. */
  clear() {
    safeStorage.remove(STORAGE_KEY.SESSION);
    listeners.forEach((listener) => listener());
  },

  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
