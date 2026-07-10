FROM node:24-bookworm-slim AS build
WORKDIR /workspace
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/core/package.json packages/core/tsconfig.json packages/core/
COPY packages/core/src packages/core/src
COPY services/ingestion-worker/package.json services/ingestion-worker/tsconfig.json services/ingestion-worker/
COPY services/ingestion-worker/src services/ingestion-worker/src
RUN corepack pnpm install --frozen-lockfile
RUN corepack pnpm --filter @opentrade-registry/core build && corepack pnpm --filter @opentrade-registry/ingestion-worker build

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /workspace/node_modules /app/node_modules
COPY --from=build /workspace/packages/core /app/packages/core
COPY --from=build /workspace/services/ingestion-worker /app/services/ingestion-worker
WORKDIR /app/services/ingestion-worker
USER node
CMD ["node", "dist/main.js"]
