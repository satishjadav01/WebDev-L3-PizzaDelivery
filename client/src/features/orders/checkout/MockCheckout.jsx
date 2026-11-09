import { ordersApi } from '../../../api/orders.api.js';
import { Button } from '../../../components/ui/Button.jsx';
import { ErrorBanner } from '../../../components/ui/ErrorBanner.jsx';
import { MOCK_OUTCOME } from '../../../config/constants.js';
import { useClientConfig } from '../../../context/ClientConfigContext.jsx';
import { useAsyncAction } from '../../../hooks/useAsyncAction.js';

/**
 * Stand-in for the gateway's popup while no payment keys are configured. It mirrors the
 * real flow: the "gateway" returns a signed payment, which is then confirmed with the API.
 */
export function MockCheckout({ order, checkout, onPaid, onFailed }) {
  const { formatMoney } = useClientConfig();

  const pay = useAsyncAction(async () => {
    const payment = await ordersApi.mockCheckout(order.id, MOCK_OUTCOME.SUCCESS);
    const confirmed = await ordersApi.confirmPayment(order.id, {
      providerPaymentId: payment.providerPaymentId,
      signature: payment.signature,
    });
    onPaid(confirmed.order);
  });

  const decline = useAsyncAction(async () => {
    await ordersApi.reportPaymentFailure(order.id);
    onFailed();
  });

  return (
    <div>
      <p className="text-ink-soft">
        Test checkout. No money moves. Choose how this payment should end.
      </p>
      <p className="mt-4 font-display text-3xl font-extrabold">
        {formatMoney(checkout.amountMinor)}
      </p>
      <ErrorBanner error={pay.error ?? decline.error} className="mt-4" />
      <div className="mt-6 flex flex-wrap gap-3">
        <Button loading={pay.pending} disabled={decline.pending} onClick={() => pay.run()}>
          Pay successfully
        </Button>
        <Button
          variant="danger"
          loading={decline.pending}
          disabled={pay.pending}
          onClick={() => decline.run()}
        >
          Fail the payment
        </Button>
      </div>
    </div>
  );
}
