import { QueryClient } from '@tanstack/react-query';
import { HTTP_STATUS, QUERY_DEFAULTS } from './constants.js';

// Client errors (4xx) will not fix themselves, so only transient failures are retried.
const shouldRetry = (failureCount, error) =>
  failureCount < QUERY_DEFAULTS.maxRetries &&
  !(error?.status >= HTTP_STATUS.BAD_REQUEST && error?.status < HTTP_STATUS.INTERNAL_SERVER_ERROR);

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: QUERY_DEFAULTS.staleTimeMs,
        retry: shouldRetry,
        refetchOnWindowFocus: false,
      },
    },
  });
}
