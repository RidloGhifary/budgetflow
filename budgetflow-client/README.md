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
NEXT_PUBLIC_API_URL=http://localhost:6000/api
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

The client service runs on `http://localhost:3000` and uses `NEXT_PUBLIC_API_URL=http://localhost:6000/api` for browser requests to the backend.

## AI Dashboard Chat

The Dashboard page includes a floating `Ask AI` widget. It only sends chat messages to the BudgetFlow server at `/api/ai/chat`; the browser never receives AI provider keys or provider URLs. Configure the server AI provider with the server `.env` values, or use `AI_PROVIDER=mock` for local development.

## PWA Install Support

BudgetFlow is installable as a Progressive Web App in supported browsers. The app includes:

- App Router manifest at `/manifest.webmanifest`
- BudgetFlow icons in `/icons`
- Standalone display metadata
- A production-only service worker at `/sw.js`
- Offline fallback page at `/offline.html` plus a branded `/offline` route

To test the install flow locally:

```bash
pnpm build
pnpm start
```

Then open the production app in Chrome or Edge and inspect DevTools > Application:

- Manifest should show `BudgetFlow`, `standalone` display mode, and valid icons.
- Service Workers should show `/sw.js` registered.
- The browser install option should appear where supported.

Offline behavior is intentionally limited. BudgetFlow will show an offline fallback for failed page navigations, but it does not cache private financial API responses. The service worker bypasses `/api/*`, including auth, transactions, budgets, debts, goals, reports, exports, and AI chat requests.

During development, service worker registration is disabled to avoid stale-cache confusion. If a production service worker was previously installed, clear it from DevTools > Application > Service Workers and clear site storage before retesting.
