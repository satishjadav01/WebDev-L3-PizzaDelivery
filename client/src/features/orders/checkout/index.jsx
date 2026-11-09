import { Modal } from '../../../components/ui/Modal.jsx';
import { PAYMENT_PROVIDER } from '../../../config/constants.js';
import { MockCheckout } from './MockCheckout.jsx';
import { RazorpayCheckout } from './RazorpayCheckout.jsx';

// How each provider presents its checkout. Adding a gateway is one entry.
// `hosted` gateways draw their own window above the page, so the app must NOT open a modal
// <dialog> for them: a modal makes everything outside it inert, including the gateway's iframe.
const ADAPTERS = Object.freeze({
  [PAYMENT_PROVIDER.MOCK]: { Component: MockCheckout, hosted: false },
  [PAYMENT_PROVIDER.RAZORPAY]: { Component: RazorpayCheckout, hosted: true },
});

/**
 * Takes payment for an order that has just been placed. The provider named in `checkout`
 * (decided by server config) picks the UI; the surrounding contract is identical:
 * `onPaid(order)` on success, `onFailed()` when payment fails or is abandoned.
 */
export function CheckoutDialog({ order, checkout, onPaid, onFailed }) {
  const adapter = ADAPTERS[checkout.provider];

  if (!adapter) {
    return (
      <Modal open title="Complete your payment" dismissible={false}>
        <p role="alert">This payment method is not supported by this version of the app.</p>
      </Modal>
    );
  }

  const { Component, hosted } = adapter;
  const content = (
    <Component order={order} checkout={checkout} onPaid={onPaid} onFailed={onFailed} />
  );

  if (hosted) {
    return (
      <div className="fixed inset-0 z-10 flex items-center justify-center bg-ink/40">
        <div className="rounded-2xl bg-paper p-6 shadow-xl">{content}</div>
      </div>
    );
  }
  return (
    <Modal open title="Complete your payment" dismissible={false}>
      {content}
    </Modal>
  );
}
