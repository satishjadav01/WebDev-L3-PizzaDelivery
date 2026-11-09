# Configuration

Two kinds of settings, deliberately separate:

1. **Environment** (`server/.env`, validated by `src/config/env.schema.js`): secrets and values
   that differ per deployment.
2. **Tunables** (`server/config/*.js`): behaviour you may want to adjust. Edit and restart.

The server exits at startup with one readable message if any environment value is invalid.

## Environment (`server/.env`)

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `NODE_ENV` | no | `development` | `development`, `test`, `production` |
| `PORT` | no | `4000` | API port |
| `LOG_LEVEL` | no | `info` | pino level |
| `LOG_PRETTY` | no | `false` | Readable coloured logs (development only) |
| `MONGODB_URI` | **yes** | | `mongodb://` or `mongodb+srv://` connection string |
| `JWT_SECRET` | **yes** | | At least 32 characters |
| `CLIENT_ORIGIN` | **yes** | | Comma-separated browser origins allowed by CORS |
| `CLIENT_BASE_URL` | no | first `CLIENT_ORIGIN` | Base URL used in email links |
| `EMAIL_PROVIDER` | no | `ethereal` | `ethereal` (fake inbox), `log` (prints emails and links to the server log; development only), or `smtp` |
| `EMAIL_FROM_ADDRESS`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | with `smtp` | | SMTP account |
| `PAYMENT_PROVIDER` | no | `mock` | `mock` or `razorpay` |
| `MOCK_PAYMENT_SECRET` | with `mock` | | Signs the test checkout |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | with `razorpay` | | Gateway keys (test or live) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | for `create-admin` | | The admin account to create |

Client (`client/.env`): `VITE_DEV_API_TARGET` (where `pnpm dev` proxies `/api`) and
`VITE_API_BASE_URL` (absolute API URL for production builds; empty means same-origin `/api/v1`).

## Tunables (`server/config/`)

| File | Controls |
|---|---|
| `app.config.js` | default port, shutdown timeout, DB pool and retry, pagination, **client polling interval** |
| `auth.config.js` | JWT lifetime/issuer, bcrypt cost, password rules, token sizes and lifetimes, resend cooldown |
| `security.config.js` | body limit, CORS methods/headers, rate-limit windows and limits, log redaction paths |
| `order.config.js` | currency, per-order limits, custom pizza fee and name, **status labels, tracker steps, legal transitions** |
| `inventory.config.js` | per-category builder step, selection min/max, default alert threshold, alert cooldown, max manual stock |
| `mail.config.js` | sender name, SMTP timeouts, link paths used in emails |
| `payment.config.js` | receipt prefix and length, mock id formats |
| `cron.config.js` | job schedules, enabled flags, run-on-start |
| `inventory.seed.json`, `menu.seed.json` | ingredients (price, stock) and house pizzas |

Example: to alert at fewer than 30 pizza bases, change `defaultThreshold` for `base` in
`inventory.config.js`, or set a per-item `threshold` in `inventory.seed.json`, then re-seed.
Admins can also change any item's threshold live from the Inventory page.

Email link paths in `mail.config.js` must match client routes in `client/src/config/routes.js`;
a client test pins this.
