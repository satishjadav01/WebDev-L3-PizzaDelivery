import { Router } from 'express';
import { ROLE } from '../constants/index.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../middleware/validate.js';

export function createOrderRoutes({ controller, schemas, authenticate }) {
  const router = Router();
  router.use(authenticate, requireRole(ROLE.CUSTOMER));

  const byId = { params: schemas.idParam };

  router.post('/quote', validate({ body: schemas.placeOrder }), controller.quote);
  router.post('/', validate({ body: schemas.placeOrder }), controller.place);
  router.get('/', controller.listMine);
  router.get('/:id', validate(byId), controller.getMine);
  router.post(
    '/:id/payment',
    validate({ ...byId, body: schemas.confirmPayment }),
    controller.confirmPayment,
  );
  router.post('/:id/payment-failure', validate(byId), controller.reportPaymentFailure);
  router.post(
    '/:id/mock-checkout',
    validate({ ...byId, body: schemas.mockCheckout }),
    controller.mockCheckout,
  );
  return router;
}
