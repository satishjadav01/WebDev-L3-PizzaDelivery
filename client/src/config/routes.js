/**
 * Every URL the app serves. The email links built by the server (config/mail.config.js
 * `links`) must match `verifyEmail`, `resetPassword` and `admin.inventory`; a test pins that.
 */
export const ROUTES = Object.freeze({
  home: '/',
  login: '/login',
  register: '/register',
  verifyEmail: '/verify-email',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  builder: '/build',
  cart: '/cart',
  summary: '/checkout/summary',
  orders: '/orders',
  order: (id) => `/orders/${id}`,
  admin: Object.freeze({
    login: '/admin/login',
    inventory: '/admin/inventory',
    orders: '/admin/orders',
  }),
});
