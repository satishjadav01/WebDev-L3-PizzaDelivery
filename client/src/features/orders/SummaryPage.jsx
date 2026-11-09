import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ordersApi } from '../../api/orders.api.js';
import { Button } from '../../components/ui/Button.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { ErrorBanner } from '../../components/ui/ErrorBanner.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { QUERY_KEY } from '../../config/constants.js';
import { ROUTES } from '../../config/routes.js';
import { useCart } from '../../context/CartContext.jsx';
import { useClientConfig } from '../../context/ClientConfigContext.jsx';
import { useAsyncAction } from '../../hooks/useAsyncAction.js';
import { CheckoutDialog } from './checkout/index.jsx';

/** The last look before paying: server-priced lines, then payment. */
export function SummaryPage() {
  const { entries, toOrderLines, clear } = useCart();
  const { formatMoney } = useClientConfig();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(null);
  const [paymentFailed, setPaymentFailed] = useState(false);

  const lines = toOrderLines();
  const quote = useQuery({
    queryKey: ['quote', lines],
    queryFn: () => ordersApi.quote(lines),
    enabled: entries.length > 0,
    staleTime: 0,
  });
  const place = useAsyncAction(() => ordersApi.place(lines));

  const startPayment = async () => {
    setPaymentFailed(false);
    const placed = await place.run();
    if (placed) setPending(placed);
  };

  const onPaid = useCallback(
    (order) => {
      clear();
      queryClient.invalidateQueries({ queryKey: QUERY_KEY.MY_ORDERS });
      navigate(ROUTES.order(order.id), { replace: true });
    },
    [clear, navigate, queryClient],
  );
  const onFailed = useCallback(() => {
    setPending(null);
    setPaymentFailed(true);
  }, []);

  if (entries.length === 0) {
    return (
      <EmptyState
        title="Nothing to review"
        action={
          <Link to={ROUTES.home} className="font-semibold text-tomato-deep underline">
            Browse the menu
          </Link>
        }
      >
        Add a pizza to your cart first.
      </EmptyState>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-extrabold">Order summary</h1>
      {quote.isPending && <Spinner label="Pricing your order" />}
      <ErrorBanner error={quote.error} onRetry={() => quote.refetch()} className="mt-6" />

      {quote.data && (
        <>
          <ul className="mt-6 divide-y divide-line rounded-2xl border border-line bg-paper">
            {quote.data.quote.lines.map((line, index) => (
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
          <p className="mt-4 flex justify-between rounded-xl bg-ink px-5 py-4 text-lg font-bold text-white">
            <span>Total</span>
            <span>{formatMoney(quote.data.quote.amountMinor)}</span>
          </p>
        </>
      )}

      {paymentFailed && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-tomato/40 bg-tomato/5 p-4 text-tomato-deep"
        >
          Your payment was not completed and nothing was charged. You can try again.
        </p>
      )}
      <ErrorBanner error={place.error} className="mt-4" />

      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <Link
          to={ROUTES.cart}
          className="self-center text-sm font-semibold text-tomato-deep underline"
        >
          Edit cart
        </Link>
        <Button size="lg" disabled={!quote.data} loading={place.pending} onClick={startPayment}>
          {quote.data ? `Pay ${formatMoney(quote.data.quote.amountMinor)}` : 'Pay'}
        </Button>
      </div>

      {pending && (
        <CheckoutDialog
          order={pending.order}
          checkout={pending.checkout}
          onPaid={onPaid}
          onFailed={onFailed}
        />
      )}
    </div>
  );
}
