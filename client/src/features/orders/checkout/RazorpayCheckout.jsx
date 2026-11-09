import { useEffect, useRef, useState } from 'react';
import { ordersApi } from '../../../api/orders.api.js';
import { ErrorBanner } from '../../../components/ui/ErrorBanner.jsx';
import { Spinner } from '../../../components/ui/Spinner.jsx';
import { RAZORPAY_CHECKOUT_SCRIPT } from '../../../config/constants.js';
import { useAuth } from '../../../context/AuthContext.jsx';
import { loadScript } from '../../../utils/loadScript.js';

/**
 * Opens Razorpay's hosted checkout. Its callbacks hand back `razorpay_payment_id` and
 * `razorpay_signature`, which the API verifies before the order counts as paid.
 */
export function RazorpayCheckout({ order, checkout, onPaid, onFailed }) {
  const { user } = useAuth();
  const [error, setError] = useState(null);
  const opened = useRef(false);

  useEffect(() => {
    // Opening twice (StrictMode) would create two overlapping checkout windows.
    if (opened.current) return;
    opened.current = true;

    const failCheckout = async () => {
      try {
        await ordersApi.reportPaymentFailure(order.id);
      } finally {
        onFailed();
      }
    };

    loadScript(RAZORPAY_CHECKOUT_SCRIPT)
      .then(() => {
        const gateway = new window.Razorpay({
          key: checkout.keyId,
          order_id: checkout.providerOrderId,
          amount: checkout.amountMinor,
          currency: checkout.currency,
          prefill: { name: user?.name, email: user?.email },
          handler: async (response) => {
            try {
              const confirmed = await ordersApi.confirmPayment(order.id, {
                providerPaymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              });
              onPaid(confirmed.order);
            } catch (failure) {
              setError(failure);
            }
          },
          // A failed attempt marks the order failed for good, so the widget must not offer a
          // retry that could succeed (and charge) against an order we already closed.
          retry: { enabled: false },
          modal: { ondismiss: failCheckout },
        });
        gateway.on('payment.failed', failCheckout);
        gateway.open();
      })
      .catch(setError);
  }, [checkout, order.id, onPaid, onFailed, user]);

  return error ? (
    <ErrorBanner error={error} />
  ) : (
    <Spinner label="Opening the secure payment window" />
  );
}
