import { InvalidStatusTransitionError } from '../utils/errors/index.js';

/**
 * Order lifecycle rules, driven entirely by `order.config.js`. Nothing else in the codebase
 * decides which status changes are legal or who may perform them.
 */
export function createOrderStatusService({ orderConfig }) {
  const { transitions, statusLabels, trackerSteps } = orderConfig;

  const targetsFrom = (from, actor) =>
    transitions
      .filter((rule) => rule.from === from && rule.actors.includes(actor))
      .map((rule) => rule.to);

  return {
    allowedNext: targetsFrom,

    assertTransition({ from, to, actor }) {
      const allowed = targetsFrom(from, actor);
      if (!allowed.includes(to)) throw new InvalidStatusTransitionError({ from, to, allowed });
    },

    labelOf: (status) => statusLabels[status] ?? status,

    /** The customer-facing progress bar: each step flagged as reached or not. */
    trackerFor(status) {
      const reachedIndex = trackerSteps.indexOf(status);
      return trackerSteps.map((step, index) => ({
        status: step,
        label: statusLabels[step],
        reached: reachedIndex >= index,
      }));
    },
  };
}
