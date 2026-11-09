import { describeDuration } from '../../utils/duration.js';
import { renderLayout } from './layout.js';

export function renderVerifyEmail({ name, link, ttlMs }) {
  return {
    subject: 'Confirm your email address',
    ...renderLayout({
      heading: `Welcome, ${name}!`,
      paragraphs: [
        'Please confirm your email address to start ordering pizza.',
        `This link is valid for ${describeDuration(ttlMs)}.`,
      ],
      action: { label: 'Confirm email', url: link },
      footer: 'If you did not create an account, you can ignore this message.',
    }),
  };
}

export function renderResetPassword({ name, link, ttlMs }) {
  return {
    subject: 'Reset your password',
    ...renderLayout({
      heading: `Hi ${name},`,
      paragraphs: [
        'We received a request to reset your password.',
        `This link is valid for ${describeDuration(ttlMs)} and can be used once.`,
      ],
      action: { label: 'Choose a new password', url: link },
      footer: 'If you did not ask for this, your password stays unchanged.',
    }),
  };
}

export function renderLowStockAlert({ items, link }) {
  const lines = items.map(
    (item) => `${item.name} (${item.category}): ${item.quantity} left, threshold ${item.threshold}`,
  );
  return {
    subject: `Low stock: ${items.length} item${items.length === 1 ? '' : 's'} need restocking`,
    ...renderLayout({
      heading: 'Inventory is running low',
      paragraphs: lines,
      action: { label: 'Open inventory', url: link },
    }),
  };
}
