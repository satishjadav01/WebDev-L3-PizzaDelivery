import { ORDER_STATUS } from '../config/constants.js';

/** A status after which nothing changes, so polling can stop. */
export function isTerminalStatus(status, trackerSteps) {
  return status === ORDER_STATUS.PAYMENT_FAILED || status === trackerSteps.at(-1);
}

/** The status an admin can move an order to next, or null when it is finished. */
export function nextKitchenStatus(status, trackerSteps) {
  const index = trackerSteps.indexOf(status);
  return index === -1 ? null : (trackerSteps[index + 1] ?? null);
}

/**
 * How long to wait before asking about an order again, or false to stop. Unknown status
 * (first load) keeps polling; a final status ends it.
 */
export function pollIntervalFor(status, { trackerSteps, intervalMs }) {
  return status && isTerminalStatus(status, trackerSteps) ? false : intervalMs;
}
