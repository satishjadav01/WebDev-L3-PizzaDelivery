# Brief checklist, mapped to code and tests

Source: OIBSIP task list, Web Development Level 3, Pizza Delivery Full-Stack Application.

## User side

| Requirement | Implemented in | Verified by |
|---|---|---|
| Registration with email verification | `auth.service.js`, `notification.service.js`, `RegisterPage`, `VerifyEmailPage` | `auth.flow.test.js` (verify once, expiry, reuse); real click-through with an Ethereal email link |a
| Login with JWT authorisation | `token.service.js`, `authenticate.js`, `LoginPage` | `auth.flow.test.js` (blocked until verified, forged tokens, enumeration safety) |
| Forgot password (email reset link) | `auth.service.js` `forgotPassword`/`resetPassword`, `ForgotPasswordPage`, `ResetPasswordPage` | `auth.flow.test.js` (single use, policy enforced) |
| Dashboard of pizza varieties | `catalog.service.js`, `DashboardPage` | `orders.flow.test.js` catalog cases |
| Custom builder: base (5), sauce (5), cheese, vegetables (multi-select) | `inventory.config.js` steps, `BuilderPage`, `builderState.js`, `PizzaPreview` | `seedData.test.js` (5 and 5), `builderState.test.js`, `BuilderPage.test.jsx` |
| Order summary before payment | `POST /orders/quote`, `SummaryPage` | `quote.test.js`; click-through |
| Razorpay checkout (test mode) | `razorpay.provider.js`, `RazorpayCheckout.jsx`; local `mock` stand-in | `paymentProviders.test.js`, `CheckoutDialog.test.jsx` (both branches) |
| Live status: Order Received, In Kitchen, Sent to Delivery | `order.config.js`, `useOrderQuery`, `OrderTracker` | `admin.flow.test.js` walk-through; click-through with two tabs |

## Admin side

| Requirement | Implemented in | Verified by |
|---|---|---|
| Separate admin login | `/admin/auth/login`, `AdminLoginPage`, `createAdmin.js` | `auth.flow.test.js` admin cases |
| Inventory dashboard (bases, sauces, cheeses, vegetables) | `InventoryPage`, `adminInventory.controller.js` | `admin.flow.test.js` |
| Stock decremented automatically after each order | `order.service.js` `confirmPayment`, `inventory.repository.js` | `orders.flow.test.js`, `db.payment.test.js` (real MongoDB) |
| Manual stock update per item | `PATCH /admin/inventory/:id` | `admin.flow.test.js`, `db.repositories.test.js` |
| Email admin when stock is below a configurable threshold, scheduled | `lowStockAlert.service.js`, `scheduler.js`, `cron.config.js` | `lowStock.alert.test.js`, `scheduler.test.js`, `boot.smoke.test.js` |
| Order management panel with status updates | `AdminOrdersPage`, `orderStatus.service.js` | `admin.flow.test.js`, `orderStatus.test.js` |
| Status change shown live to the customer | polling at `app.config.js` interval | click-through; `utils.test.js` polling rules |

## Engineering requirements

| Requirement | How |
|---|---|
| Config-driven, no hard-coded values | `server/config/*`, validated env, `/meta/client-config`; see `configuration.md` |
| Atomic, reusable modules | One responsibility per file; factories with injected dependencies |
| Robustness | Guarded atomic updates, transactions, idempotent payment, graceful shutdown, typed errors |
| Provider swap without code changes | `EMAIL_PROVIDER`, `PAYMENT_PROVIDER` registries and contracts |
