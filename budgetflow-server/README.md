# BudgetFlow Server

Express and Prisma REST API for BudgetFlow V1.

## Features

- Cookie/JWT authentication with register, login, logout, and current-user endpoints.
- User-scoped CRUD APIs for wallets, categories, transactions, budgets, debts, and saving goals.
- Summary endpoints for dashboard, budgets, debts, and saving goals.
- Report endpoints for monthly, date-range, transaction, budget, debt, and saving goal views.
- XLSX and CSV export endpoints for monthly, transaction, budget, debt, and saving goal reports.
- PostgreSQL persistence with Prisma, request validation with Zod, CORS, Helmet, structured errors, and `/health`.

## Setup

```bash
pnpm install
cp .env.example .env
pnpm prisma:generate
pnpm migration:run
pnpm dev
```

Set real local values before running migrations or authenticated endpoints:

```env
PORT=4000
DATABASE_URL=postgresql://user:password@localhost:5432/budgetflow
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:3000
NODE_ENV=development
AI_PROVIDER=mock
AI_BASE_URL=
AI_API_KEY=
AI_MODEL=
AI_TIMEOUT_MS=15000
AI_RATE_LIMIT_WINDOW_MS=60000
AI_RATE_LIMIT_MAX_REQUESTS=10
AI_DAILY_LIMIT_PER_USER=50
AUTH_REGISTER_RATE_LIMIT_WINDOW_MS=900000
AUTH_REGISTER_RATE_LIMIT_MAX=5
AUTH_LOGIN_RATE_LIMIT_WINDOW_MS=900000
AUTH_LOGIN_RATE_LIMIT_MAX=10
BLOCKED_EMAIL_DOMAINS=
```

## Scripts

```bash
pnpm dev
pnpm build
pnpm start
pnpm container:dev
pnpm container:start
pnpm container:worker
pnpm lint
pnpm prisma:generate
pnpm migration:run
pnpm migration:deploy
pnpm db:studio
pnpm update:disposable-email-blocklist
```

Use `pnpm prisma:generate`, `pnpm lint`, and `pnpm build` before shipping changes.

## Docker

The full local stack is managed from the parent `budgetflow` directory:

```bash
cp .env.example .env
docker compose up --build
```

The server container waits for PostgreSQL, generates Prisma Client, runs `prisma migrate deploy`, and then starts the API. Migration errors are written directly to the container logs with the `DATABASE_URL` password masked.

The server service runs on `http://localhost:4000`, uses PostgreSQL at the Docker hostname `postgres`, and exposes health at `http://localhost:4000/health`.

To inspect migration status without changing the database:

```bash
docker compose exec server pnpm exec prisma migrate status --schema prisma/schema.prisma
```

## Auth Security

Registration and login normalize emails by trimming whitespace and lowercasing before validation, lookup, and storage. Registration blocks disposable email domains using a vendored local copy of the `disposable-email-domains/disposable-email-domains` blocklist at `src/modules/auth/data/disposable_email_blocklist.conf`.

The blocklist is loaded locally and is not fetched from GitHub during registration. To refresh it manually, run:

```bash
pnpm update:disposable-email-blocklist
```

Registration can also merge additional blocked domains from:

```env
BLOCKED_EMAIL_DOMAINS=example.com,test.com
```

Auth endpoints use in-memory rate limits:

```env
AUTH_REGISTER_RATE_LIMIT_WINDOW_MS=900000
AUTH_REGISTER_RATE_LIMIT_MAX=5
AUTH_LOGIN_RATE_LIMIT_WINDOW_MS=900000
AUTH_LOGIN_RATE_LIMIT_MAX=10
```

The register limiter is IP-based. The login limiter uses IP plus normalized email when present. Rate-limit responses return `429` with a user-friendly message. The current limiter is in-memory and resets when the server restarts.

## API Surface

Public:

```txt
GET /health
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
```

Authenticated:

```txt
GET /api/auth/me
POST /api/ai/chat
GET /api/dashboard/summary
GET|POST /api/wallets
GET|PATCH|DELETE /api/wallets/:id
GET|POST /api/categories
GET|PATCH|DELETE /api/categories/:id
GET|POST /api/transactions
GET|PATCH|DELETE /api/transactions/:id
GET|POST /api/budgets
GET /api/budgets/summary
GET|PATCH|DELETE /api/budgets/:id
GET|POST /api/debts
GET /api/debts/summary
POST /api/debts/:id/payments
GET|PATCH|DELETE /api/debts/:id
GET|POST /api/goals
GET /api/goals/summary
POST /api/goals/:id/contributions
GET|PATCH|DELETE /api/goals/:id
GET /api/reports/monthly
GET /api/reports/range
GET /api/reports/transactions
GET /api/reports/budgets
GET /api/reports/debts
GET /api/reports/goals
GET /api/reports/monthly/export
GET /api/reports/transactions/export
GET /api/reports/budgets/export
GET /api/reports/debts/export
GET /api/reports/goals/export
```

## AI Dashboard Analysis

`POST /api/ai/chat` is an authenticated, read-only dashboard analysis endpoint. The server validates the message, applies in-memory per-user limits, builds summarized dashboard context for the authenticated user, and sends only that context to the configured AI provider.

Default local provider:

```env
AI_PROVIDER=mock
```

The mock provider does not call an external service and is suitable for local development.

OpenAI-compatible HTTP provider:

```env
AI_PROVIDER=http
AI_BASE_URL=https://your-openai-compatible-provider.example/v1
AI_API_KEY=replace-with-real-key
AI_MODEL=your-model
```

The HTTP provider calls `POST {AI_BASE_URL}/chat/completions` from the server only. Never expose `AI_API_KEY` to the client.

Rate limits are configured with:

```env
AI_RATE_LIMIT_WINDOW_MS=60000
AI_RATE_LIMIT_MAX_REQUESTS=10
AI_DAILY_LIMIT_PER_USER=50
```

The current limiter is in-memory and resets when the server restarts.
