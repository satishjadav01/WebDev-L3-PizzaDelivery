import { ROLE } from '../constants/index.js';

/**
 * Emails admins about ingredients that fell below their threshold. Items are claimed first
 * (so repeats are throttled by the cooldown) and handed back if nobody could be notified.
 */
export function createLowStockAlertService({
  inventoryRepository,
  userRepository,
  notificationService,
  inventoryConfig,
  clock,
  logger,
}) {
  const { cooldownMs } = inventoryConfig.lowStockAlert;

  return {
    async run() {
      const claimed = await inventoryRepository.claimLowStock({ now: clock.now(), cooldownMs });
      if (claimed.length === 0) return { alerted: 0, recipients: 0 };

      const release = () =>
        inventoryRepository.releaseLowStockClaims(claimed.map((item) => item._id));

      const admins = await userRepository.listByRole(ROLE.ADMIN);
      if (admins.length === 0) {
        await release();
        logger.warn({ items: claimed.length }, 'low stock detected but no admin to notify');
        return { alerted: 0, recipients: 0 };
      }

      const items = claimed.map(({ name, category, quantity, threshold }) => ({
        name,
        category,
        quantity,
        threshold,
      }));
      const results = await Promise.allSettled(
        admins.map((admin) =>
          notificationService.sendLowStockAlert({ recipient: admin.email, items }),
        ),
      );
      const delivered = results.filter((result) => result.status === 'fulfilled').length;

      if (delivered === 0) {
        await release();
        logger.error({ items: items.length }, 'low stock alert could not be delivered, will retry');
        return { alerted: 0, recipients: 0 };
      }

      logger.info({ items: items.length, recipients: delivered }, 'low stock alert sent');
      return { alerted: items.length, recipients: delivered };
    },
  };
}
