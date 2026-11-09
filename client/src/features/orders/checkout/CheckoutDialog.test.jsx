import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ordersApi } from '../../../api/orders.api.js';
import * as loadScriptModule from '../../../utils/loadScript.js';
import { orderFixture } from '../../../test/fixtures.js';
import { renderWithProviders } from '../../../test/render.jsx';
import { CheckoutDialog } from './index.jsx';

const order = orderFixture({ status: 'awaiting_payment' });
const mockCheckout = {
  provider: 'mock',
  providerOrderId: 'order_mock_1',
  amountMinor: 25000,
  currency: 'INR',
};
const razorpayCheckout = {
  provider: 'razorpay',
  keyId: 'rzp_test_key',
  providerOrderId: 'order_rzp_1',
  amountMinor: 25000,
  currency: 'INR',
};

let onPaid;
let onFailed;

beforeEach(() => {
  onPaid = vi.fn();
  onFailed = vi.fn();
  vi.spyOn(ordersApi, 'confirmPayment').mockResolvedValue({ order: orderFixture() });
  vi.spyOn(ordersApi, 'reportPaymentFailure').mockResolvedValue({ order });
});

afterEach(() => {
  delete window.Razorpay;
  vi.restoreAllMocks();
});

describe('mock checkout', () => {
  beforeEach(() => {
    vi.spyOn(ordersApi, 'mockCheckout').mockResolvedValue({
      success: true,
      providerPaymentId: 'pay_mock_9',
      signature: 'sig-9',
    });
  });

  it('gets a signed payment from the gateway stand-in, confirms it, then reports paid', async () => {
    renderWithProviders(
      <CheckoutDialog order={order} checkout={mockCheckout} onPaid={onPaid} onFailed={onFailed} />,
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Pay successfully' }));

    await waitFor(() => expect(onPaid).toHaveBeenCalledWith(orderFixture()));
    expect(ordersApi.mockCheckout).toHaveBeenCalledWith(order.id, 'success');
    expect(ordersApi.confirmPayment).toHaveBeenCalledWith(order.id, {
      providerPaymentId: 'pay_mock_9',
      signature: 'sig-9',
    });
    expect(onFailed).not.toHaveBeenCalled();
  });

  it('records a declined payment and hands control back', async () => {
    renderWithProviders(
      <CheckoutDialog order={order} checkout={mockCheckout} onPaid={onPaid} onFailed={onFailed} />,
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Fail the payment' }));

    await waitFor(() => expect(onFailed).toHaveBeenCalled());
    expect(ordersApi.reportPaymentFailure).toHaveBeenCalledWith(order.id);
    expect(ordersApi.confirmPayment).not.toHaveBeenCalled();
    expect(onPaid).not.toHaveBeenCalled();
  });

  it('shows the API error and stays open when confirmation is rejected', async () => {
    ordersApi.confirmPayment.mockRejectedValue(
      new Error('Some ingredients are no longer available'),
    );
    renderWithProviders(
      <CheckoutDialog order={order} checkout={mockCheckout} onPaid={onPaid} onFailed={onFailed} />,
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Pay successfully' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/no longer available/);
    expect(onPaid).not.toHaveBeenCalled();
  });
});

describe('razorpay checkout', () => {
  let options;
  let handlers;

  beforeEach(() => {
    vi.spyOn(loadScriptModule, 'loadScript').mockResolvedValue();
    options = undefined;
    handlers = {};
    window.Razorpay = class {
      constructor(config) {
        options = config;
      }
      on(event, handler) {
        handlers[event] = handler;
      }
      open() {}
    };
  });

  const renderCheckout = () =>
    renderWithProviders(
      <CheckoutDialog
        order={order}
        checkout={razorpayCheckout}
        onPaid={onPaid}
        onFailed={onFailed}
      />,
    );

  it('does not wrap the hosted window in a modal dialog, which would make it unclickable', async () => {
    renderCheckout();
    await waitFor(() => expect(options).toBeDefined());
    expect(document.querySelector('dialog[open]')).toBeNull();
    expect(options.retry).toEqual({ enabled: false });
  });

  it('opens the hosted window with the public key and the gateway order', async () => {
    renderCheckout();
    await waitFor(() => expect(options).toBeDefined());
    expect(options).toMatchObject({
      key: 'rzp_test_key',
      order_id: 'order_rzp_1',
      amount: 25000,
      currency: 'INR',
    });
  });

  it('sends Razorpay ids and signature to the API when payment succeeds', async () => {
    renderCheckout();
    await waitFor(() => expect(options).toBeDefined());
    await options.handler({ razorpay_payment_id: 'pay_1', razorpay_signature: 'sig_1' });

    expect(ordersApi.confirmPayment).toHaveBeenCalledWith(order.id, {
      providerPaymentId: 'pay_1',
      signature: 'sig_1',
    });
    expect(onPaid).toHaveBeenCalledWith(orderFixture());
  });

  it('reports failure when the customer closes the window', async () => {
    renderCheckout();
    await waitFor(() => expect(options).toBeDefined());
    await options.modal.ondismiss();

    expect(ordersApi.reportPaymentFailure).toHaveBeenCalledWith(order.id);
    expect(onFailed).toHaveBeenCalled();
  });

  it('reports failure when the gateway declines the payment', async () => {
    renderCheckout();
    await waitFor(() => expect(handlers['payment.failed']).toBeDefined());
    await handlers['payment.failed']();

    expect(ordersApi.reportPaymentFailure).toHaveBeenCalledWith(order.id);
    expect(onFailed).toHaveBeenCalled();
  });

  it('explains when the gateway script cannot be loaded', async () => {
    loadScriptModule.loadScript.mockRejectedValue(
      new Error('The payment window could not be loaded.'),
    );
    renderCheckout();
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not be loaded/);
  });
});

describe('unknown provider', () => {
  it('refuses rather than guessing', async () => {
    renderWithProviders(
      <CheckoutDialog
        order={order}
        checkout={{ ...mockCheckout, provider: 'stripe' }}
        onPaid={onPaid}
        onFailed={onFailed}
      />,
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(/not supported/);
  });
});
