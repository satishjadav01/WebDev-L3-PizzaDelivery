import { Router } from 'express';

export function createCatalogRoutes({ controller }) {
  const router = Router();
  router.get('/pizzas', controller.menu);
  router.get('/builder', controller.builder);
  return router;
}
