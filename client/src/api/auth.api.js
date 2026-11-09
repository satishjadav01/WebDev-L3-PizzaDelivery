import { request } from './httpClient.js';

export const authApi = {
  register: (body) => request({ method: 'post', url: '/auth/register', data: body }),
  verifyEmail: (token) => request({ method: 'post', url: '/auth/verify-email', data: { token } }),
  resendVerification: (email) =>
    request({ method: 'post', url: '/auth/resend-verification', data: { email } }),
  login: (body) => request({ method: 'post', url: '/auth/login', data: body }),
  adminLogin: (body) => request({ method: 'post', url: '/admin/auth/login', data: body }),
  forgotPassword: (email) =>
    request({ method: 'post', url: '/auth/forgot-password', data: { email } }),
  resetPassword: (body) => request({ method: 'post', url: '/auth/reset-password', data: body }),
  me: () => request({ method: 'get', url: '/auth/me' }),
};
