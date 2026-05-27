FROM node:22-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable \
  && corepack prepare pnpm@10.26.1 --activate

WORKDIR /app

FROM base AS deps

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS development

ENV NODE_ENV=development

COPY prisma ./prisma
RUN pnpm prisma:generate
COPY . .

EXPOSE 4000

CMD ["pnpm", "dev"]

FROM deps AS builder

COPY prisma ./prisma
RUN pnpm prisma:generate
COPY . .
RUN pnpm build

FROM base AS production

ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
COPY scripts ./scripts
RUN pnpm install --frozen-lockfile \
  && pnpm prisma:generate \
  && pnpm prune --prod

COPY --from=builder /app/dist ./dist

EXPOSE 4000

CMD ["pnpm", "container:start"]
