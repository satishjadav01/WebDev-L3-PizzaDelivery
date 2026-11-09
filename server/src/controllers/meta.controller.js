/**
 * Public settings the browser needs, so the client never duplicates server rules
 * (status labels, polling interval, password policy, which checkout to open).
 */
export function createMetaController({ config, paymentProvider }) {
  const { order, auth, app } = config;
  const body = Object.freeze({
    currency: order.currency,
    limits: order.limits,
    polling: app.clientPolling,
    orderStatus: { labels: order.statusLabels, trackerSteps: order.trackerSteps },
    passwordPolicy: {
      minLength: auth.password.minLength,
      maxLength: auth.password.maxLength,
      requireDigit: auth.password.requireDigit,
      requireLetter: auth.password.requireLetter,
    },
    pricing: { customPizzaPreparationFeeMinor: order.pricing.customPizzaPreparationFeeMinor },
    payment: {
      ...paymentProvider.describeForClient(),
      simulatedCheckout: typeof paymentProvider.simulateCheckout === 'function',
    },
  });

  return {
    clientConfig(_req, res) {
      res.json(body);
    },
  };
}
