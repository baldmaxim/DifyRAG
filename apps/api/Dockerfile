# Document Knowledge Portal API (NestJS) — multi-stage build.
FROM node:22-slim AS builder
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /app

# Install workspace deps (cached on manifest changes).
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile

# Build shared + api and generate the Prisma client.
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @dkp/shared build \
  && pnpm --filter @dkp/api exec prisma generate \
  && pnpm --filter @dkp/api build

FROM node:22-slim AS runner
RUN apt-get update && apt-get install -y --no-install-recommends openssl wget ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
ENV NODE_PATH=/app/node_modules/.pnpm/node_modules:/app/node_modules
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
# Pin Prisma CLI for migrations (pnpm hoists it under .pnpm in builder only).
RUN npm install -g prisma@6.19.3

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=5 \
  CMD wget -qO- http://localhost:3000/api/v1/health || exit 1

CMD ["sh", "-c", "cd apps/api && prisma migrate deploy && node dist/main.js"]
