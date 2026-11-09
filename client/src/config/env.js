const SAME_ORIGIN_API_BASE = '/api/v1';

export const env = Object.freeze({
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL || SAME_ORIGIN_API_BASE).replace(/\/+$/, ''),
});
