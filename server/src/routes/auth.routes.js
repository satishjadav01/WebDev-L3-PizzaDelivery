import { Router } from 'express';
import { validate } from '../middleware/validate.js';

/**
 * `authLimiter` guards every endpoint that accepts a credential or one-time token. Session
 * restore (`/me`) is deliberately outside it: the browser calls it on every page load.
 */
export function createAuthRoutes({ controller, schemas, authenticate, authLimiter }) {
  const router = Router();
  const guarded = (schema) => [authLimiter, validate({ body: schema })];

  router.post('/register', ...guarded(schemas.register), controller.register);
  router.post('/verify-email', ...guarded(schemas.verifyEmail), controller.verifyEmail);
  router.post(
    '/resend-verification',
    ...guarded(schemas.resendVerification),
    controller.resendVerification,
  );
  router.post('/login', ...guarded(schemas.login), controller.login);
  router.post('/forgot-password', ...guarded(schemas.forgotPassword), controller.forgotPassword);
  router.post('/reset-password', ...guarded(schemas.resetPassword), controller.resetPassword);
  router.get('/me', authenticate, controller.me);
  return router;
}
