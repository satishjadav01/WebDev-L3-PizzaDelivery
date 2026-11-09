# Architecture

## Request flow

```
route -> controller -> service -> repository -> model
            |             |
        presenter     providers (email, payment)
```

- **Routes** wire URLs to controllers and attach middleware (auth, role, validation, rate limits).
- **Controllers** are thin: take validated input, call one service, shape the response.
- **Services** hold every business rule. They never see `req`/`res` and never touch Mongoose
  directly; they receive repositories and providers by injection.
- **Repositories** are the only code that queries MongoDB. They contain no business rules.
- **Presenters** decide what leaves the API, so models never leak internals (e.g. password hashes).
- **Providers** hide third parties behind a contract: email (`ethereal`, `smtp`) and payment
  (`mock`, `razorpay`). The factory picks one from config; adapters are checked against the
  contract at startup.
- **`container.js`** is the single composition root. Tests pass overrides (fake repositories,
  clock, providers) so the real app runs without a database.

## Folder layout

```
WebDev-L3-PizzaDelivery/
  server/
    config/                 tunables: one file per concern (see configuration.md)
    src/
      config/               env schema + frozen config builder
      constants/            enums: roles, statuses, error codes, HTTP codes
      controllers/ (+admin) routes/ (+admin) middleware/ validators/ presenters/
      services/             auth, token, password, catalog, pricing, order, orderStatus,
                            inventory, lowStockAlert, notification, health
      repositories/         user, token, inventory, pizza, order
      models/               User, Token, InventoryItem, Pizza, Order
      providers/            email/ payment/ (contract, adapters, factory)
      jobs/                 scheduler + low-stock job
      templates/email/      email layout and messages
      db/                   connection, transaction runner
      seed/                 catalog seeding and consistency checks
      scripts/              seed.js, createAdmin.js
      utils/                errors, logger, crypto, clock, duration, merge, contract
      container.js app.js server.js
    tools/                  dev:memory (in-memory database demo)
    tests/                  unit/ integration/ helpers/ support/
  client/
    src/
      config/               constants, routes, env, query client
      api/                  one module per resource + HTTP client
      context/              auth, cart, client-config providers
      hooks/ utils/ storage/ routes/ layouts/ components/ui/
      features/             auth catalog builder orders (checkout/) admin
```

## Decisions worth knowing

**Configuration, not literals.** Secrets and per-environment values come from `.env`, validated at
startup (the app refuses to boot on a bad value, listing every problem). Everything else (token
lifetimes, bcrypt cost, rate limits, stock thresholds, alert cooldown, cron schedule, order
statuses and transitions, currency, pagination, polling interval) lives in `server/config/*.js`.
Catalog and menu live in seed JSON. The browser reads the settings it needs (status labels,
polling interval, password rules, checkout type) from `GET /meta/client-config`, so rules are
never duplicated in the client.

**Money is integer minor units** (paise). Prices always come from the database; the client sends
ids and quantities only. `POST /orders/quote` gives the summary page authoritative totals without
creating an order.

**Order lifecycle is data.** `order.config.js` lists the legal status transitions and who may
perform each; `orderStatus.service.js` only evaluates them. Customer-facing labels are the exact
wording from the brief: Order Received, In Kitchen, Sent to Delivery.

**Stock is atomic.** Availability is pre-checked when an order is placed (friendly early error).
When payment is confirmed, a single MongoDB transaction (1) claims the order with a guarded update
and (2) decrements each ingredient with a conditional update (`quantity >= needed`). A duplicate
confirmation loses the claim and never touches stock; a sell-out mid-payment rolls everything
back. The real-MongoDB suite proves both, including racing customers for the last units.

**Payments verify the same way in every mode.** The mock provider signs `order_id|payment_id`
with HMAC exactly like Razorpay, so switching `PAYMENT_PROVIDER` changes no verification code.

**Low-stock alerts** run on a cron schedule from config. Each item is claimed with a guarded
update that stamps `lastAlertedAt`, so two app instances cannot double-send; the claim is handed
back if no admin could be notified, and restocking above the threshold re-arms the alert.

**Auth.** JWT access tokens (algorithm pinned), bcrypt-hashed passwords, email verification
required before customer login, single-use hashed tokens for verification and reset links.
Wrong password and unknown email are indistinguishable; forgot-password never reveals whether an
account exists. Admin login is a separate endpoint and rejects customer accounts (and vice versa).
Request bodies are strict schemas, which also rejects NoSQL operator objects.

**Client session** is kept in `sessionStorage`: per tab, so an admin tab never replaces a customer
tab's session, and it ends with the tab. The trade-off is signing in again after closing a tab.

## Known limitations

- **No payment webhook.** If a customer pays but closes the tab before the browser reports back,
  the order stays "awaiting payment". Production needs a gateway webhook.
- **Refunds are manual.** If an ingredient sells out in the seconds between paying and settling,
  the order is marked failed and the server logs an error for manual refund.
- **Unpaid orders never expire.** They are hidden from the kitchen board but remain stored.
- **Rate limiting is per client IP and in memory,** so it resets on restart and is per instance.
  Offices behind one shared IP may need higher limits (`security.config.js`).
- **Order status uses polling,** not WebSockets, at the interval set in `app.config.js`.
