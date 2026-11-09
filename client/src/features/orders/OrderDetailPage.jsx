import { Link, useParams } from 'react-router-dom';
import { ErrorBanner } from '../../components/ui/ErrorBanner.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { StatusBadge } from '../../components/ui/StatusBadge.jsx';
import { ORDER_STATUS } from '../../config/constants.js';
import { ROUTES } from '../../config/routes.js';
import { useClientConfig } from '../../context/ClientConfigContext.jsx';
import { useOrderQuery } from '../../hooks/useOrderQuery.js';
import { OrderTracker } from './OrderTracker.jsx';

const formatDateTime = (value) =>
  new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export function OrderDetailPage() {
  const { id } = useParams();
  const { formatMoney } = useClientConfig();
  const query = useOrderQuery(id);

  if (query.isPending) return <Spinner label="Loading your order" />;
  if (query.isError) return <ErrorBanner error={query.error} onRetry={() => query.refetch()} />;

  const { order } = query.data;
  const failed = order.status === ORDER_STATUS.PAYMENT_FAILED;

  return (
    <div className="mx-auto max-w-3xl">
      <Link to={ROUTES.orders} className="text-sm font-semibold text-tomato-deep underline">
        All orders
      </Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold">Order placed {formatDateTime(order.createdAt)}</h1>
        <StatusBadge status={order.status} label={order.statusLabel} />
      </div>

      <section className="mt-6 rounded-2xl border border-line bg-paper p-6" aria-live="polite">
        {failed ? (
          <p role="alert" className="text-tomato-deep">
            Payment did not go through, so this order was not sent to the kitchen and you were not
            charged.
          </p>
        ) : (
          <OrderTracker steps={order.tracker} />
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-line bg-paper" aria-label="Items">
        <ul className="divide-y divide-line">
          {order.lines.map((line, index) => (
            <li key={`${line.name}-${index}`} className="flex gap-4 p-5">
              <div className="min-w-0 flex-1">
                <p className="font-bold">
                  {line.quantity} × {line.name}
                </p>
                <p className="text-sm text-ink-soft">
                  {line.ingredients.map((ingredient) => ingredient.name).join(', ')}
                </p>
              </div>
              <p className="font-semibold">{formatMoney(line.unitPriceMinor * line.quantity)}</p>
            </li>
          ))}
        </ul>
        <p className="flex justify-between border-t border-line px-5 py-4 text-lg font-bold">
          <span>Total</span>
          <span>{formatMoney(order.amountMinor)}</span>
        </p>
      </section>
    </div>
  );
}
