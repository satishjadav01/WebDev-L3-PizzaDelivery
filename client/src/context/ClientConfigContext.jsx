/* eslint-disable react-refresh/only-export-components */
import { useQuery } from '@tanstack/react-query';
import { createContext, useContext, useMemo } from 'react';
import { metaApi } from '../api/catalog.api.js';
import { ErrorBanner } from '../components/ui/ErrorBanner.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';
import { QUERY_KEY } from '../config/constants.js';
import { createMoneyFormatter } from '../utils/money.js';

const ClientConfigContext = createContext(null);

/**
 * Loads the settings the server owns (status labels, polling interval, password rules,
 * checkout type) once, and renders children only after they are available, so no screen
 * ever has to guess them.
 */
export function ClientConfigProvider({ children }) {
  const query = useQuery({
    queryKey: QUERY_KEY.CLIENT_CONFIG,
    queryFn: metaApi.clientConfig,
    staleTime: Infinity,
  });

  const value = useMemo(
    () =>
      query.data ? { ...query.data, formatMoney: createMoneyFormatter(query.data.currency) } : null,
    [query.data],
  );

  if (query.isPending) return <Spinner label="Starting up" fullPage />;
  if (query.isError) {
    return (
      <div className="mx-auto max-w-md p-6">
        <ErrorBanner error={query.error} onRetry={() => query.refetch()} />
      </div>
    );
  }
  return <ClientConfigContext.Provider value={value}>{children}</ClientConfigContext.Provider>;
}

export function useClientConfig() {
  const value = useContext(ClientConfigContext);
  if (!value) throw new Error('useClientConfig must be used inside ClientConfigProvider');
  return value;
}
