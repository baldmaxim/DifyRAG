# Document Knowledge Portal web (React/Vite) served by nginx.
FROM node:22-slim AS builder
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile

COPY packages/shared packages/shared
COPY apps/web apps/web
RUN pnpm --filter @dkp/shared build && pnpm --filter @dkp/web build

FROM nginx:1.27-alpine AS runner
COPY infra/platform/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
