import { describe, expect, it } from 'vitest';
import { DAY_MS, HOUR_MS, MINUTE_MS } from '../../config/units.js';
import { renderLowStockAlert, renderVerifyEmail } from '../../src/templates/email/index.js';
import { describeDuration } from '../../src/utils/duration.js';

describe('describeDuration', () => {
  it.each([
    [DAY_MS, '1 day'],
    [2 * DAY_MS, '2 days'],
    [HOUR_MS, '1 hour'],
    [6 * HOUR_MS, '6 hours'],
    [2 * MINUTE_MS, '2 minutes'],
  ])('%i ms reads as "%s"', (ms, expected) => {
    expect(describeDuration(ms)).toBe(expected);
  });
});

describe('email templates', () => {
  it('escapes user-supplied values in html but keeps the plain-text link intact', () => {
    const mail = renderVerifyEmail({
      name: '<script>alert(1)</script>',
      link: 'https://pizza.test/verify?token=abc&x=1',
      ttlMs: DAY_MS,
    });
    expect(mail.html).not.toContain('<script>');
    expect(mail.html).toContain('&lt;script&gt;');
    expect(mail.text).toContain('https://pizza.test/verify?token=abc&x=1');
    expect(mail.text).toContain('1 day');
  });

  it('lists every low-stock item and pluralises the subject', () => {
    const items = [
      { name: 'Thin Crust', category: 'base', quantity: 4, threshold: 20 },
      { name: 'Pesto', category: 'sauce', quantity: 2, threshold: 15 },
    ];
    const mail = renderLowStockAlert({ items, link: 'https://pizza.test/admin/inventory' });
    expect(mail.subject).toBe('Low stock: 2 items need restocking');
    expect(mail.text).toContain('Thin Crust (base): 4 left, threshold 20');
    expect(mail.text).toContain('Pesto (sauce): 2 left, threshold 15');
  });
});
