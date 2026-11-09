/** Injectable time source so expiry logic can be tested without waiting. */
export const systemClock = Object.freeze({
  now: () => new Date(),
});
