import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { adminApi } from '../../api/admin.api.js';
import { Button } from '../../components/ui/Button.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { ErrorBanner } from '../../components/ui/ErrorBanner.jsx';
import { Field } from '../../components/ui/Field.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { StatusBadge } from '../../components/ui/StatusBadge.jsx';
import { QUERY_KEY } from '../../config/constants.js';
import { useClientConfig } from '../../context/ClientConfigContext.jsx';
import { nextKitchenStatus } from '../../utils/orderStatus.js';

const ALL_PAID = 'paid';

/** The kitchen board: paid orders, refreshed automatically, one click to the next stage. */
export function AdminOrdersPage() {
  const { orderStatus, polling } = useClientConfig();
  const [filter, setFilter] = useState(ALL_PAID);

  // "Paid" is every status on the customer tracker; abandoned checkouts stay out of the way.
  const statusParam = filter === ALL_PAID ? orderStatus.trackerSteps.join(',') : filter;
  const filters = { status: statusParam };
  const orders = useQuery({
    queryKey: QUERY_KEY.ADMIN_ORDERS(filters),
    queryFn: () => adminApi.orders(filters),
    refetchInterval: polling.orderStatusIntervalMs,
    staleTime: 0,
  });

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl font-extrabold">Orders</h1>
        <Field
          as="select"
          label="Show"
          className="w-56"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        >
          <option value={ALL_PAID}>All paid orders</option>
          {orderStatus.trackerSteps.map((status) => (
            <option key={status} value={status}>
              {orderStatus.labels[status]}
            </option>
          ))}
        </Field>
      </div>

      {orders.isPending && <Spinner label="Loading orders" />}
      <ErrorBanner error={orders.error} onRetry={() => orders.refetch()} className="mt-6" />
      {orders.data?.orders.length === 0 && (
        <div className="mt-6">
          <EmptyState title="No orders here">New paid orders appear automatically.</EmptyState>
        </div>
      )}
      <ul className="mt-6 space-y-4">
        {orders.data?.orders.map((order) => (
          <AdminOrderCard key={order.id} order={order} filters={filters} />
        ))}
      </ul>
    </div>
  );
}

function AdminOrderCard({ order, filters }) {
  const { orderStatus, formatMoney } = useClientConfig();
  const queryClient = useQueryClient();
  const next = nextKitchenStatus(order.status, orderStatus.trackerSteps);

  const advance = useMutation({
    mutationFn: () => adminApi.changeOrderStatus(order.id, next),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY.ADMIN_ORDERS(filters) }),
  });

  return (
    <li className="rounded-2xl border border-line bg-paper p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-bold">{order.customer?.name ?? 'Customer'}</p>
          <p className="text-sm text-ink-soft">
            {new Date(order.createdAt).toLocaleString(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </p>
        </div>
        <StatusBadge status={order.status} label={order.statusLabel} />
      </div>
      <ul className="mt-4 space-y-1 text-sm">
        {order.lines.map((line, index) => (
          <li key={`${line.name}-${index}`}>
            <span className="font-semibold">
              {line.quantity} × {line.name}
            </span>{' '}
            <span className="text-ink-soft">
              {line.ingredients.map((ingredient) => ingredient.name).join(', ')}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className="font-semibold">{formatMoney(order.amountMinor)}</span>
        {next ? (
          <Button loading={advance.isPending} onClick={() => advance.mutate()}>
            Move to {orderStatus.labels[next]}
          </Button>
        ) : (
          <span className="text-sm font-semibold text-basil">Finished</span>
        )}
      </div>
      <ErrorBanner error={advance.error} className="mt-3" />
    </li>
  );
}
