import { request } from './httpClient.js';

export const ordersApi = {
  quote: (lines) => request({ method: 'post', url: '/orders/quote', data: { lines } }),
  place: (lines) => request({ method: 'post', url: '/orders', data: { lines } }),
  list: () => request({ method: 'get', url: '/orders' }),
  get: (id) => request({ method: 'get', url: `/orders/${id}` }),
  mockCheckout: (id, outcome) =>
    request({ method: 'post', url: `/orders/${id}/mock-checkout`, data: { outcome } }),
  confirmPayment: (id, payment) =>
    request({ method: 'post', url: `/orders/${id}/payment`, data: payment }),
  reportPaymentFailure: (id) => request({ method: 'post', url: `/orders/${id}/payment-failure` }),
};
