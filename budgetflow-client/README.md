# BudgetFlow Client

Next.js frontend for BudgetFlow V1, a manual-first personal finance dashboard.

## Features

- Authenticated dashboard shell with protected pages.
- Wallet, category, transaction, budget, debt, and saving goal management.
- Dashboard summaries, report previews, and XLSX/CSV exports through the backend API.
- Responsive UI built with Tailwind CSS, lucide icons, React Hook Form, and Zod validation.

## Setup

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Set `NEXT_PUBLIC_API_URL` in `.env.local` to the API base URL, for example:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

The app expects the BudgetFlow server to be running and reachable at that URL.

## Scripts

```bash
pnpm dev
pnpm lint
pnpm build
pnpm start
```

Use `pnpm lint` and `pnpm build` before shipping changes.

## Docker

The full local stack is managed from the parent `budgetflow` directory:

```bash
cp .env.example .env
docker compose up --build
```

The client service runs on `http://localhost:3000` and uses `NEXT_PUBLIC_API_URL=http://localhost:4000/api` for browser requests to the backend.
