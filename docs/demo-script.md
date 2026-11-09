# Demo script

Start with a 2-second static title card showing your **full name**, **track** (Web Development &
Designing) and **task title** (Pizza Delivery Full-Stack Application). Then record the whole run
without cutting away.

## Setup (before recording)

- `pnpm dev:memory` in `server` and `pnpm dev` in `client`.
- Two browser windows side by side: one for the customer, one for the admin. Each tab keeps its
  own session, so they do not interfere.
- Keep the server terminal visible; it prints the email preview links.

## Walkthrough

1. **Register** a new customer. Point out the live password checklist.
2. In the server terminal, open the **verification email preview link**, click *Confirm email*.
3. **Sign in** as the new customer. Show that the menu loads.
4. **Build your own pizza**: pick a base, sauce, cheese and a few vegetables. Show the pizza
   assembling, the vegetable limit, and the sold-out state if you have set one.
5. **Add to cart**, change the quantity, open the **order summary** and note the server-priced
   total.
6. **Pay** with the test checkout. Show the order landing on *Order Received*.
7. **Admin window**: sign in at `/admin/login`. Open **Orders**, move the order to *In Kitchen*,
   then *Sent to Delivery*. In the customer window, show the tracker updating on its own.
8. **Inventory**: show stock reduced for the ingredients used. Set one base's stock below its
   threshold. Within the scheduled interval show the **low-stock email** preview link in the
   server terminal.
9. **Forgot password**: request a reset, open the preview link, set a new password, sign in again.
10. Briefly show `server/config` and `docs/configuration.md` to make the point that tunables are
    configuration, and `.env` switches email and payment providers.

## Tips

- To trigger the low-stock alert quickly, lower `schedule` in `server/config/cron.config.js`
  (for example `* * * * *` for every minute), restart, then restore it.
- Demo logins are printed by `pnpm dev:memory` and listed in the README.
