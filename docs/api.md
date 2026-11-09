# API reference

Base path `/api/v1`. JSON in, JSON out. Authenticated calls send `Authorization: Bearer <token>`.

## Errors

Every failure has the same shape:

```json
{ "error": { "code": "OUT_OF_STOCK", "message": "…", "details": {}, "requestId": "…" } }
```

`requestId` matches the `x-request-id` response header and the server log line. Status codes:
400 invalid input, 401 not signed in, 403 wrong role or unverified email, 404 not found
(also used for other customers' orders), 409 conflict (duplicate, out of stock, already paid),
422 illegal order status change, 429 rate limited, 502 payment or mail provider failed.

## Public

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | `200` when the database is up, otherwise `503` |
| GET | `/meta/client-config` | Currency, limits, polling interval, status labels and tracker steps, password rules, custom pizza fee, checkout provider |
| GET | `/catalog/pizzas` | House pizzas with ingredients, price and `inStock` |
| GET | `/catalog/builder` | Builder steps in order, each with `min`, `max` and options (`inStock`, price) |

## Authentication

| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/auth/register` | `name`, `email`, `password` | Sends a verification email |
| POST | `/auth/verify-email` | `token` | Single use |
| POST | `/auth/resend-verification` | `email` | Always `202`; honours a cooldown |
| POST | `/auth/login` | `email`, `password` | `403 EMAIL_NOT_VERIFIED` until confirmed |
| POST | `/auth/forgot-password` | `email` | Always `202`; never reveals whether the account exists |
| POST | `/auth/reset-password` | `token`, `password` | Single use |
| GET | `/auth/me` | | Current user |
| POST | `/admin/auth/login` | `email`, `password` | Admin accounts only |

Login returns `{ accessToken, tokenType, expiresInMs, user }`. Credential endpoints are
rate limited; `/auth/me` and polling are not.

## Customer orders (customer role)

| Method | Path | Notes |
|---|---|---|
| POST | `/orders/quote` | Prices a cart and checks stock; creates nothing |
| POST | `/orders` | Creates the order (awaiting payment) and a gateway order; returns `checkout` details |
| GET | `/orders`, `/orders/:id` | Own orders, with `status`, `statusLabel` and `tracker` |
| POST | `/orders/:id/payment` | `providerPaymentId`, `signature`: verifies, marks paid and takes stock atomically; idempotent |
| POST | `/orders/:id/payment-failure` | Customer closed or failed checkout; idempotent |
| POST | `/orders/:id/mock-checkout` | `outcome`: `success` or `failure`. Only when `PAYMENT_PROVIDER=mock` |

Cart lines: `{ "kind": "menu", "pizzaId", "quantity" }` or
`{ "kind": "custom", "itemIds": [...], "quantity" }`. Prices are never accepted from the client.

## Admin (admin role)

| Method | Path | Notes |
|---|---|---|
| GET | `/admin/inventory` | All items with stock, threshold and `isLow` |
| PATCH | `/admin/inventory/:id` | `quantity` and/or `threshold` |
| GET | `/admin/orders` | Query: `status` (one or comma-separated), `page`, `pageSize` |
| PATCH | `/admin/orders/:id/status` | `status`: must be the next legal step |
