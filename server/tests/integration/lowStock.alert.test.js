import { beforeEach, describe, expect, it } from 'vitest';
import { createTestApp } from '../helpers/testApp.js';

let ctx;
let inventory;
let mailbox;
let alerts;

const ADMIN = { email: 'admin@example.test', password: 'Admin-test-pass-1' };

beforeEach(async () => {
  ctx = createTestApp();
  inventory = ctx.fakes.repositories.inventory;
  mailbox = ctx.fakes.emailProvider;
  alerts = ctx.container.services.lowStockAlert;
  await ctx.container.services.auth.provisionAdmin(ADMIN);
});

const baseThreshold = () => ctx.config.inventory.categories.base.defaultThreshold;
const drain = (key, quantity) => {
  inventory.byKey(key).quantity = quantity;
};

describe('low stock alert', () => {
  it('does nothing while every item is above its threshold', async () => {
    expect(await alerts.run()).toEqual({ alerted: 0, recipients: 0 });
    expect(mailbox.outbox).toHaveLength(0);
  });

  it('treats the threshold as exclusive: exactly 20 bases is still fine', async () => {
    drain('base-thin', baseThreshold());
    expect((await alerts.run()).alerted).toBe(0);
  });

  it('emails the admin once, listing every item below its threshold', async () => {
    drain('base-thin', baseThreshold() - 1);
    drain('sauce-pesto', 2);

    const outcome = await alerts.run();
    expect(outcome).toEqual({ alerted: 2, recipients: 1 });
    expect(mailbox.outbox).toHaveLength(1);

    const [mail] = mailbox.outbox;
    expect(mail.to).toBe(ADMIN.email);
    expect(mail.subject).toContain('2 items');
    expect(mail.text).toContain(`Thin Crust (base): ${baseThreshold() - 1} left`);
    expect(mail.text).toContain('Basil Pesto (sauce): 2 left');
  });

  it('stays quiet during the cooldown, then reminds again', async () => {
    drain('base-thin', 1);
    await alerts.run();
    expect(mailbox.outbox).toHaveLength(1);

    ctx.clock.advance(ctx.config.inventory.lowStockAlert.cooldownMs - 1);
    await alerts.run();
    expect(mailbox.outbox).toHaveLength(1);

    ctx.clock.advance(2);
    await alerts.run();
    expect(mailbox.outbox).toHaveLength(2);
  });

  it('alerts immediately again after a restock and a fresh shortage', async () => {
    drain('base-thin', 1);
    await alerts.run();

    await ctx.container.services.inventory.setQuantity({
      id: inventory.byKey('base-thin')._id,
      quantity: 100,
    });
    drain('base-thin', 1);
    await alerts.run();
    expect(mailbox.outbox).toHaveLength(2);
  });

  it('hands the claim back when the mail cannot be sent, so the next run retries', async () => {
    drain('base-thin', 1);
    mailbox.sendMail.mockRejectedValueOnce(new Error('smtp down'));

    expect(await alerts.run()).toEqual({ alerted: 0, recipients: 0 });
    expect(inventory.byKey('base-thin').lastAlertedAt).toBeNull();

    expect((await alerts.run()).alerted).toBe(1);
    expect(mailbox.outbox).toHaveLength(1);
  });

  it('releases the claim when there is no admin to notify', async () => {
    ctx.fakes.repositories.user.users.length = 0;
    drain('base-thin', 1);

    expect((await alerts.run()).alerted).toBe(0);
    expect(inventory.byKey('base-thin').lastAlertedAt).toBeNull();
  });

  it('notifies every admin and counts only successful deliveries', async () => {
    await ctx.container.services.auth.provisionAdmin({
      email: 'second.admin@example.test',
      password: ADMIN.password,
    });
    drain('base-thin', 1);

    const outcome = await alerts.run();
    expect(outcome.recipients).toBe(2);
    expect(mailbox.outbox.map((mail) => mail.to).sort()).toEqual([
      ADMIN.email,
      'second.admin@example.test',
    ]);
  });

  it('ignores inactive items', async () => {
    drain('base-thin', 0);
    inventory.byKey('base-thin').isActive = false;
    expect((await alerts.run()).alerted).toBe(0);
  });
});
