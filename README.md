# Pizza Delivery Management System

A full-stack pizza ordering and delivery management application with separate customer and admin experiences. The backend is organized around clear service boundaries, repository-based database access, configurable payment and email providers, and transaction-safe inventory updates.

**Repository:** `WebDev-L3-PizzaDelivery`  
**Maintainer:** [Satish Jadav](https://github.com/satishjadav01)

---

## Project Description

The Pizza Delivery Management System is designed to manage the main flow of an online pizza order: customers can browse the catalog, build a cart, review an authoritative order quote, and proceed through checkout. The backend supports authentication, order processing, payment verification, inventory management, notifications, and an admin workflow.

The application uses a layered backend architecture:

```text
route -> controller -> service -> repository -> model
            |             |
        presenter     providers (email, payment)
```

Business rules are kept in services, database queries are isolated in repositories, and presenters control which data is returned by the API.

## Key Features

### Customer experience
- Customer authentication with email verification.
- Password reset using single-use tokens.
- Pizza catalog browsing.
- Cart and checkout flow.
- Order quote endpoint for authoritative totals before order creation.
- Customer-facing order status labels:
  - Order Received
  - In Kitchen
  - Sent to Delivery
- Order status updates retrieved through client polling.

### Admin and operations
- Separate admin login endpoint.
- Role-aware routes and middleware.
- Catalog and inventory management foundations.
- Order status transition rules.
- Low-stock monitoring and scheduled alerts.
- Admin notifications for low-stock events.

### Backend reliability and security
- JWT access tokens with a pinned algorithm.
- Bcrypt password hashing.
- Strict request-body validation.
- Rate limiting.
- Generic authentication errors to avoid revealing whether an email exists.
- MongoDB transactions for payment confirmation and stock deduction.
- Provider adapters for mock and Razorpay payment modes.
- Email provider adapters for Ethereal and SMTP.

---

## Technology and Architecture

The project structure and implementation notes identify the following technologies and patterns:

- **Frontend:** React
- **Backend:** Node.js application organized into routes, controllers, services, and repositories
- **Database:** MongoDB with Mongoose models
- **Authentication:** JWT and bcrypt
- **Payments:** Mock provider and Razorpay adapter
- **Email:** Ethereal and SMTP adapters
- **Scheduled work:** Cron-based low-stock job
- **Testing:** Unit and integration test structure, including real-MongoDB transaction tests
- **Client data and session:** API modules, query client, and `sessionStorage`

---

## Architecture

### Request flow

```text
route -> controller -> service -> repository -> model
            |             |
        presenter     providers (email, payment)
```

- **Routes** connect URLs to controllers and attach middleware such as authentication, role checks, validation, and rate limits.
- **Controllers** accept validated input, call a service, and shape the response.
- **Services** contain business rules. They do not depend on Express `req` / `res` objects or query Mongoose directly.
- **Repositories** are the only layer that queries MongoDB. They do not contain business rules.
- **Presenters** decide which fields are exposed by the API so internal model data, such as password hashes, is not leaked.
- **Providers** wrap third-party integrations behind contracts. Email adapters include Ethereal and SMTP; payment adapters include mock and Razorpay.
- **`container.js`** is the composition root. Tests can inject fake repositories, clocks, and providers so application logic can be tested without a real database.

### Folder layout

```text
WebDev-L3-PizzaDelivery/
├── server/
│   ├── config/                 # Tunables, one file per concern
│   ├── src/
│   │   ├── config/             # Environment schema and config builder
│   │   ├── constants/          # Roles, statuses, error codes, HTTP codes
│   │   ├── controllers/        # Request controllers, including admin
│   │   ├── routes/             # API routes, including admin
│   │   ├── middleware/         # Authentication, roles, validation, rate limits
│   │   ├── validators/         # Request schemas
│   │   ├── presenters/        # API response shaping
│   │   ├── services/           # Application business logic
│   │   ├── repositories/      # MongoDB data access
│   │   ├── models/             # User, Token, InventoryItem, Pizza, Order
│   │   ├── providers/
│   │   │   ├── email/          # Provider contract, adapters, factory
│   │   │   └── payment/        # Provider contract, adapters, factory
│   │   ├── jobs/               # Scheduler and low-stock job
│   │   ├── templates/email/    # Email layout and messages
│   │   ├── db/                 # Connection and transaction runner
│   │   ├── seed/               # Catalog seeding and consistency checks
│   │   ├── scripts/            # Seed and admin creation scripts
│   │   ├── utils/              # Errors, logger, crypto, clock, helpers
│   │   ├── container.js        # Dependency composition root
│   │   ├── app.js
│   │   └── server.js
│   ├── tools/                  # In-memory database demo
│   └── tests/
│       ├── unit/
│       ├── integration/
│       ├── helpers/
│       └── support/
└── client/
    └── src/
        ├── config/             # Constants, routes, env, query client
        ├── api/                # Resource API modules and HTTP client
        ├── context/            # Auth, cart, client-config providers
        ├── hooks/
        ├── utils/
        ├── storage/
        ├── routes/
        ├── layouts/
        ├── components/ui/
        └── features/
            ├── auth/
            ├── catalog/
            ├── builder/
            ├── orders/
            └── admin/
```

---

## Important Design Decisions

### Configuration is centralized
Secrets and environment-specific values come from environment variables and are validated at startup. Other tunable settings—such as token lifetimes, bcrypt cost, rate limits, stock thresholds, alert cooldown, cron schedule, order statuses, currency, pagination, and polling interval—are stored in `server/config/*.js`.

The client retrieves the settings it needs, including status labels, polling interval, password rules, and checkout type, from:

```http
GET /meta/client-config
```

### Money is stored in minor units
Money values are represented as integer minor units (paise). Prices are read from the database; the client sends product IDs and quantities rather than trusted prices.

The quote endpoint provides authoritative totals without creating an order:

```http
POST /orders/quote
```

### Order lifecycle is configuration-driven
`order.config.js` defines allowed order-status transitions and who can perform them. `orderStatus.service.js` evaluates those transitions.

Customer-facing status labels are:
- Order Received
- In Kitchen
- Sent to Delivery

### Inventory updates are atomic
When an order is placed, availability is checked to provide an early response if stock is insufficient.

After payment confirmation, a MongoDB transaction:
1. Claims the order using a guarded update.
2. Decrements each required ingredient using a conditional quantity update.

A duplicate payment confirmation cannot claim the same order twice. If stock becomes unavailable during payment settlement, the transaction rolls back. The project notes describe real-MongoDB integration tests for duplicate confirmations and customers competing for the last available units.

### Payment verification is provider-independent
The mock payment provider signs `order_id|payment_id` with HMAC, matching the verification approach used for Razorpay. This keeps payment verification logic consistent when switching the configured provider.

### Low-stock alerts avoid duplicate sends
The scheduled low-stock job claims an item using a guarded update that stamps `lastAlertedAt`. This prevents multiple app instances from sending duplicate alerts for the same claim. The claim is returned if no admin can be notified, and restocking above the threshold re-arms the alert.

### Authentication and session handling
- JWT access tokens use a pinned algorithm.
- Passwords are hashed with bcrypt.
- Customer email verification is required before customer login.
- Verification and password-reset tokens are single-use and stored as hashes.
- Unknown email and wrong password responses are indistinguishable.
- Forgot-password responses do not reveal whether an account exists.
- Admin and customer login use separate endpoints.
- Request bodies use strict schemas that reject NoSQL operator objects.
- Client sessions are stored in `sessionStorage`, keeping sessions isolated per browser tab.

---

## Known Limitations

The following limitations are documented in the project:

1. **No payment webhook:** If a customer pays but closes the tab before the browser reports the result, the order can remain awaiting payment. A production deployment needs a payment-gateway webhook.
2. **Manual refunds:** If an ingredient sells out between payment and settlement, the order is marked failed and the server logs the issue for manual refund handling.
3. **Unpaid orders do not expire:** They are hidden from the kitchen board but remain stored.
4. **In-memory rate limiting:** Limits are per client IP, reset on restart, and are per application instance. Shared office IPs may need adjusted limits.
5. **Polling for order status:** The client polls for status updates rather than using WebSockets.

---

## Getting Started

The supplied project notes describe the architecture and folder layout but do not specify the exact package scripts or complete environment-variable list. Use the package files and environment examples in your checkout as the source of truth.

### Prerequisites

- Node.js and npm
- MongoDB
- A configured email provider (Ethereal or SMTP) for email workflows
- Razorpay credentials only if using the Razorpay payment adapter

### Installation

Clone your repository:

```bash
git clone https://github.com/satishjadav01/WebDev-L3-PizzaDelivery.git
cd WebDev-L3-PizzaDelivery
```

Install dependencies in the server and client folders if each contains its own `package.json`:

```bash
cd server
npm install
```

```bash
cd ../client
npm install
```

Configure environment variables using the environment example files in the project. The server validates configuration at startup, so provide all required values before running it.

### Run the application

Use the scripts defined in the relevant `package.json` files. For example, inspect available scripts with:

```bash
npm run
```

> The exact development and production commands depend on the scripts included in your repository.

---

## Testing

The project includes separate unit and integration test areas:

```text
server/tests/
├── unit/
├── integration/
├── helpers/
└── support/
```

Use the test scripts defined in `server/package.json`. The architecture notes specifically describe real-MongoDB tests for transaction and inventory race conditions.

---

## Repository

- **Project:** [WebDev-L3-PizzaDelivery](https://github.com/satishjadav01/WebDev-L3-PizzaDelivery)
- **GitHub profile:** [@satishjadav01](https://github.com/satishjadav01)

## Author

**Satish Jadav**  
[GitHub](https://github.com/satishjadav01)

---

If you find this project useful, feel free to star the repository or explore my other work on [GitHub](https://github.com/satishjadav01).
