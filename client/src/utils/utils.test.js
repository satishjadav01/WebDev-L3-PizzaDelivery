import { describe, expect, it } from 'vitest';
import { clientConfigFixture } from '../test/fixtures.js';
import { createMoneyFormatter } from './money.js';
import { isTerminalStatus, nextKitchenStatus, pollIntervalFor } from './orderStatus.js';
import { isEmail, passwordProblems } from './validation.js';

const { trackerSteps } = clientConfigFixture.orderStatus;

describe('money', () => {
  it('formats minor units in the API currency', () => {
    const format = createMoneyFormatter(clientConfigFixture.currency);
    expect(format(24900)).toMatch(/249\.00/);
    expect(format(24900)).toContain('₹');
  });
});

describe('order status helpers', () => {
  it('treats the last tracker step and failed payment as final', () => {
    expect(isTerminalStatus('sent_to_delivery', trackerSteps)).toBe(true);
    expect(isTerminalStatus('payment_failed', trackerSteps)).toBe(true);
    expect(isTerminalStatus('in_kitchen', trackerSteps)).toBe(false);
    expect(isTerminalStatus('awaiting_payment', trackerSteps)).toBe(false);
  });

  it('finds the next kitchen stage, or none when finished or not in the kitchen flow', () => {
    expect(nextKitchenStatus('order_received', trackerSteps)).toBe('in_kitchen');
    expect(nextKitchenStatus('in_kitchen', trackerSteps)).toBe('sent_to_delivery');
    expect(nextKitchenStatus('sent_to_delivery', trackerSteps)).toBeNull();
    expect(nextKitchenStatus('payment_failed', trackerSteps)).toBeNull();
  });

  it('keeps polling until a final status, then stops', () => {
    const settings = { trackerSteps, intervalMs: 5000 };
    expect(pollIntervalFor(undefined, settings)).toBe(5000);
    expect(pollIntervalFor('order_received', settings)).toBe(5000);
    expect(pollIntervalFor('in_kitchen', settings)).toBe(5000);
    expect(pollIntervalFor('sent_to_delivery', settings)).toBe(false);
    expect(pollIntervalFor('payment_failed', settings)).toBe(false);
  });
});

describe('validation', () => {
  const policy = clientConfigFixture.passwordPolicy;

  it('reports each unmet password rule', () => {
    expect(passwordProblems('abc', policy)).toEqual([
      'At least 8 characters',
      'At least one number',
    ]);
    expect(passwordProblems('12345678', policy)).toEqual(['At least one letter']);
    expect(passwordProblems('goodpass1', policy)).toEqual([]);
  });

  it('flags a password longer than the limit', () => {
    expect(passwordProblems('a1'.repeat(policy.maxLength), policy)).toEqual([
      `At most ${policy.maxLength} characters`,
    ]);
  });

  it('recognises plausible emails', () => {
    expect(isEmail('a@b.co')).toBe(true);
    expect(isEmail(' a@b.co ')).toBe(true);
    expect(isEmail('nope')).toBe(false);
  });
});
