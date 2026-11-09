export const EMAIL_PROVIDER = Object.freeze({
  ETHEREAL: 'ethereal',
  SMTP: 'smtp',
  // Development only: prints each message (and its links) to the server log, sends nothing.
  LOG: 'log',
});

export const PAYMENT_PROVIDER = Object.freeze({
  MOCK: 'mock',
  RAZORPAY: 'razorpay',
});
