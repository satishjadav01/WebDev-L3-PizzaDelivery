import { useQuery } from '@tanstack/react-query';
import { ordersApi } from '../api/orders.api.js';
import { QUERY_KEY } from '../config/constants.js';
import { useClientConfig } from '../context/ClientConfigContext.jsx';
import { pollIntervalFor } from '../utils/orderStatus.js';

/**
 * Fetches one order and keeps it fresh while it can still change. The interval comes from
 * the server's client config, and polling stops once the order reaches a final status.
 */
export function useOrderQuery(orderId) {
  const { polling, orderStatus } = useClientConfig();

  return useQuery({
    queryKey: QUERY_KEY.ORDER(orderId),
    queryFn: () => ordersApi.get(orderId),
    refetchInterval: (query) =>
      pollIntervalFor(query.state.data?.order.status, {
        trackerSteps: orderStatus.trackerSteps,
        intervalMs: polling.orderStatusIntervalMs,
      }),
    staleTime: 0,
  });
}
