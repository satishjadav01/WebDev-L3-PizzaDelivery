/**
 * sessionStorage can be missing or throw (private windows, blocked site data). Every access
 * goes through here so the app keeps working, just without persistence.
 */
export const safeStorage = {
  read(key) {
    try {
      const raw = window.sessionStorage.getItem(key);
      return raw === null ? null : JSON.parse(raw);
    } catch {
      return null;
    }
  },
  write(key, value) {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* persistence is a convenience; the in-memory state still works */
    }
  },
  remove(key) {
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      /* nothing to clean up */
    }
  },
};
