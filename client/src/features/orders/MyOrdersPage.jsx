import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ordersApi } from '../../api/orders.api.js';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { ErrorBanner } from '../../components/ui/ErrorBanner.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { StatusBadge } from '../../components/ui/StatusBadge.jsx';
import { QUERY_KEY } from '../../config/constants.js';
import { ROUTES } from '../../config/routes.js';
import { useClientConfig } from '../../context/ClientConfigContext.jsx';

export function MyOrdersPage() {
  const { formatMoney } = useClientConfig();
  const orders = useQuery({ queryKey: QUERY_KEY.MY_ORDERS, queryFn: ordersApi.list, staleTime: 0 });

  if (orders.isPending) return <Spinner label="Loading your orders" />;
  if (orders.isError) return <ErrorBanner error={orders.error} onRetry={() => orders.refetch()} />;

  if (orders.data.orders.length === 0) {
    return (
      <EmptyState
        title="No orders yet"
        action={
          <Link to={ROUTES.home} className="font-semibold text-tomato-deep underline">
            Order your first pizza
          </Link>
        }
      >
        Orders you place will show up here with live progress.
      </EmptyState>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-extrabold">My orders</h1>
      <ul className="mt-6 space-y-3">
        {orders.data.orders.map((order) => (
          <li key={order.id}>
            <Link
              to={ROUTES.order(order.id)}
              className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-paper p-5 hover:border-ink/50"
            >
              <div className="min-w-0 flex-1">
                <p className="font-bold">
                  {order.lines.map((line) => `${line.quantity} × ${line.name}`).join(', ')}
                </p>
                <p className="text-sm text-ink-soft">
                  {new Date(order.createdAt).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
              </div>
              <span className="font-semibold">{formatMoney(order.amountMinor)}</span>
              <StatusBadge status={order.status} label={order.statusLabel} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
