// Must match the key under which this job is configured in config/cron.config.js.
export const LOW_STOCK_JOB_NAME = 'lowStock';

export function createLowStockJob({ lowStockAlertService }) {
  return {
    name: LOW_STOCK_JOB_NAME,
    run: () => lowStockAlertService.run(),
  };
}
