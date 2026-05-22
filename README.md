# BudgetFlow Docker Setup

Local Docker Compose setup for the full BudgetFlow V1 stack:

- Client: Next.js on `http://localhost:3000`
- Server: Express API on `http://localhost:4000`
- PostgreSQL: exposed on `localhost:5432`

## Prerequisites

- Docker Desktop or Docker Engine with Docker Compose v2.
- `budgetflow-client` and `budgetflow-server` as sibling folders under this directory.

## Start The Stack

```bash
cp .env.example .env
docker compose up --build
```

In another terminal, run the database migrations once the containers are up:

```bash
docker compose exec server pnpm migration:deploy
```

Then open `http://localhost:3000`, register a user, and use the app locally.

## Daily Commands

```bash
docker compose up
docker compose up --build
docker compose down
docker compose logs -f client
docker compose logs -f server
docker compose logs -f postgres
```

Use `docker compose up --build` after dependency or Dockerfile changes.

## Prisma Commands

Run migrations safely inside the server container:

```bash
docker compose exec server pnpm migration:deploy
```

Generate Prisma Client manually after schema changes:

```bash
docker compose exec server pnpm prisma:generate
```

For interactive local migration work, use the existing project script:

```bash
docker compose exec server pnpm migration:run
```

`migration:run` uses Prisma Migrate Dev, so use it only for local development.

## Access Points

- Client: `http://localhost:3000`
- Server health: `http://localhost:4000/health`
- API base URL: `http://localhost:4000/api`
- PostgreSQL host from your machine: `localhost:5432`
- PostgreSQL host from containers: `postgres:5432`

Default database values come from `.env.example`. If you change `POSTGRES_USER`, `POSTGRES_PASSWORD`, or `POSTGRES_DB`, keep `DATABASE_URL` in sync.

## AI Dashboard Chat

Local Docker uses the mock AI provider by default:

```env
AI_PROVIDER=mock
```

To use a real OpenAI-compatible free or free-tier provider, set these server-side values in `.env`:

```env
AI_PROVIDER=http
AI_BASE_URL=https://your-provider.example/v1
AI_API_KEY=replace-with-real-key
AI_MODEL=your-model
```

The client still calls only `http://localhost:4000/api`; AI keys stay on the server.

## Clean Database

PostgreSQL data persists in the named volume `budgetflow_postgres_data`.

To delete the local Docker database, stop the stack and remove volumes:

```bash
docker compose down -v
```

This permanently deletes the local Docker PostgreSQL data.

## Troubleshooting

- If the server starts but register/login fails, run `docker compose exec server pnpm migration:deploy`.
- If ports are already in use, change `CLIENT_PORT` or `SERVER_PORT` in `.env`; PostgreSQL is intentionally exposed on `5432`.
- If dependencies look stale, rebuild with `docker compose up --build`.
- If hot reload misses changes on macOS, the compose file already enables polling for both client and server watchers.
