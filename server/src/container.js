import { createTransactionRunner } from './db/transaction.js';
import { inventoryRepository } from './repositories/inventory.repository.js';
import { orderRepository } from './repositories/order.repository.js';
import { pizzaRepository } from './repositories/pizza.repository.js';
import { tokenRepository } from './repositories/token.repository.js';
import { userRepository } from './repositories/user.repository.js';
import { createEmailProvider } from './providers/email/index.js';
import { createPaymentProvider } from './providers/payment/index.js';
import { createAuthService } from './services/auth.service.js';
import { createCatalogService } from './services/catalog.service.js';
import { createInventoryService } from './services/inventory.service.js';
import { createNotificationService } from './services/notification.service.js';
import { createOrderService } from './services/order.service.js';
import { createOrderStatusService } from './services/orderStatus.service.js';
import { createLowStockJob } from './jobs/lowStock.job.js';
import { createLowStockAlertService } from './services/lowStockAlert.service.js';
import { createPasswordService } from './services/password.service.js';
import { createPricingService } from './services/pricing.service.js';
import { createTokenService } from './services/token.service.js';
import { systemClock } from './utils/clock.js';

/**
 * Composition root: the one place that decides which concrete implementation backs each
 * dependency. Tests pass `overrides` (fake repositories, providers, clock) to swap pieces.
 */
export function createContainer({ config, logger, overrides = {} }) {
  const { env } = config;
  const clock = overrides.clock ?? systemClock;
  const runInTransaction = overrides.runInTransaction ?? createTransactionRunner();

  const repositories = {
    user: userRepository,
    token: tokenRepository,
    inventory: inventoryRepository,
    pizza: pizzaRepository,
    order: orderRepository,
    ...overrides.repositories,
  };

  const providers = {
    email: overrides.emailProvider ?? createEmailProvider({ env, mailConfig: config.mail, logger }),
    payment:
      overrides.paymentProvider ??
      createPaymentProvider({ env, paymentConfig: config.payment, logger }),
  };

  const passwordService = createPasswordService({ authConfig: config.auth });
  const tokenService = createTokenService({
    env,
    authConfig: config.auth,
    tokenRepository: repositories.token,
    clock,
  });
  const notificationService = createNotificationService({
    emailProvider: providers.email,
    env,
    mailConfig: config.mail,
    authConfig: config.auth,
  });
  const authService = createAuthService({
    userRepository: repositories.user,
    tokenRepository: repositories.token,
    tokenService,
    passwordService,
    notificationService,
    authConfig: config.auth,
    clock,
    logger,
  });

  const orderStatusService = createOrderStatusService({ orderConfig: config.order });
  const inventoryService = createInventoryService({
    inventoryRepository: repositories.inventory,
    inventoryConfig: config.inventory,
  });
  const pricingService = createPricingService({
    pizzaRepository: repositories.pizza,
    inventoryRepository: repositories.inventory,
    inventoryConfig: config.inventory,
    orderConfig: config.order,
  });
  const catalogService = createCatalogService({
    pizzaRepository: repositories.pizza,
    inventoryRepository: repositories.inventory,
    inventoryConfig: config.inventory,
  });
  const orderService = createOrderService({
    orderRepository: repositories.order,
    pricingService,
    inventoryService,
    orderStatusService,
    paymentProvider: providers.payment,
    paymentConfig: config.payment,
    appConfig: config.app,
    runInTransaction,
    clock,
    logger,
  });

  const lowStockAlertService = createLowStockAlertService({
    inventoryRepository: repositories.inventory,
    userRepository: repositories.user,
    notificationService,
    inventoryConfig: config.inventory,
    clock,
    logger,
  });
  const jobs = [createLowStockJob({ lowStockAlertService })];

  return {
    config,
    logger,
    clock,
    jobs,
    repositories,
    providers,
    services: {
      password: passwordService,
      token: tokenService,
      notification: notificationService,
      auth: authService,
      orderStatus: orderStatusService,
      inventory: inventoryService,
      pricing: pricingService,
      catalog: catalogService,
      order: orderService,
      lowStockAlert: lowStockAlertService,
    },
  };
}
