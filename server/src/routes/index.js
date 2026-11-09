import { Router } from 'express';
import { ROLE } from '../constants/index.js';
import { createAdminAuthController } from '../controllers/admin/adminAuth.controller.js';
import { createAdminInventoryController } from '../controllers/admin/adminInventory.controller.js';
import { createAdminOrderController } from '../controllers/admin/adminOrder.controller.js';
import { createAuthController } from '../controllers/auth.controller.js';
import { createCatalogController } from '../controllers/catalog.controller.js';
import { createMetaController } from '../controllers/meta.controller.js';
import { createOrderController } from '../controllers/order.controller.js';
import { createAuthenticate } from '../middleware/authenticate.js';
import { createRateLimiter } from '../middleware/rateLimiter.js';
import { requireRole } from '../middleware/requireRole.js';
import { buildAuthSchemas } from '../validators/auth.schema.js';
import { buildInventorySchemas } from '../validators/inventory.schema.js';
import { buildOrderSchemas } from '../validators/order.schema.js';
import { createAdminAuthRoutes } from './admin/adminAuth.routes.js';
import { createAdminInventoryRoutes } from './admin/adminInventory.routes.js';
import { createAdminOrderRoutes } from './admin/adminOrder.routes.js';
import { createAuthRoutes } from './auth.routes.js';
import { createCatalogRoutes } from './catalog.routes.js';
import { createHealthRoutes } from './health.routes.js';
import { createMetaRoutes } from './meta.routes.js';
import { createOrderRoutes } from './order.routes.js';

/** Composes every versioned router. New feature routers are mounted here. */
export function createApiRouter({ container }) {
  const { config, services, providers } = container;
  const router = Router();

  const authenticate = createAuthenticate({ tokenService: services.token });
  const { rateLimit } = config.security;
  const newAuthLimiter = () =>
    createRateLimiter(rateLimit.auth, { standardHeaders: rateLimit.standardHeaders });
  const authSchemas = buildAuthSchemas(config.auth);
  const orderSchemas = buildOrderSchemas({
    orderConfig: config.order,
    inventoryConfig: config.inventory,
    appConfig: config.app,
  });

  router.use('/health', createHealthRoutes({ appName: config.app.name }));
  router.use(
    '/meta',
    createMetaRoutes({
      controller: createMetaController({ config, paymentProvider: providers.payment }),
    }),
  );
  router.use(
    '/catalog',
    createCatalogRoutes({
      controller: createCatalogController({ catalogService: services.catalog }),
    }),
  );
  router.use(
    '/auth',
    createAuthRoutes({
      controller: createAuthController({ authService: services.auth }),
      schemas: authSchemas,
      authenticate,
      authLimiter: newAuthLimiter(),
    }),
  );
  router.use(
    '/orders',
    createOrderRoutes({
      controller: createOrderController({
        orderService: services.order,
        orderStatusService: services.orderStatus,
      }),
      schemas: orderSchemas,
      authenticate,
    }),
  );

  // Admin surface: public login first, everything after it requires an admin token.
  router.use(
    '/admin/auth',
    createAdminAuthRoutes({
      controller: createAdminAuthController({ authService: services.auth }),
      schemas: authSchemas,
      authLimiter: newAuthLimiter(),
    }),
  );
  const adminOnly = [authenticate, requireRole(ROLE.ADMIN)];
  router.use(
    '/admin/inventory',
    adminOnly,
    createAdminInventoryRoutes({
      controller: createAdminInventoryController({ inventoryService: services.inventory }),
      schemas: buildInventorySchemas(),
      idSchema: orderSchemas.idParam,
    }),
  );
  router.use(
    '/admin/orders',
    adminOnly,
    createAdminOrderRoutes({
      controller: createAdminOrderController({
        orderService: services.order,
        orderStatusService: services.orderStatus,
      }),
      schemas: orderSchemas,
    }),
  );

  return router;
}
