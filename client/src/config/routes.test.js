import { describe, expect, it } from 'vitest';
import mailConfig from '../../../server/config/mail.config.js';
import { ROUTES } from './routes.js';

describe('routes served by the client', () => {
  // Links inside emails are built by the server from its own config; if the two ever
  // diverge, customers land on a 404 from their inbox.
  it('match the paths the server puts in emails', () => {
    expect(mailConfig.links.verifyEmail).toBe(ROUTES.verifyEmail);
    expect(mailConfig.links.resetPassword).toBe(ROUTES.resetPassword);
    expect(mailConfig.links.adminInventory).toBe(ROUTES.admin.inventory);
  });

  it('builds order detail paths from an id', () => {
    expect(ROUTES.order('abc')).toBe('/orders/abc');
    expect(ROUTES.order(':id')).toBe('/orders/:id');
  });
});
