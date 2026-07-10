FROM node:24-bookworm-slim AS build
WORKDIR /workspace
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/core/package.json packages/core/tsconfig.json packages/core/
COPY packages/core/src packages/core/src
COPY packages/adapter-ak-commerce/package.json packages/adapter-ak-commerce/tsconfig.json packages/adapter-ak-commerce/
COPY packages/adapter-ak-commerce/src packages/adapter-ak-commerce/src
COPY packages/adapter-az-roc/package.json packages/adapter-az-roc/tsconfig.json packages/adapter-az-roc/
COPY packages/adapter-az-roc/src packages/adapter-az-roc/src
COPY packages/adapter-ca-cslb/package.json packages/adapter-ca-cslb/tsconfig.json packages/adapter-ca-cslb/
COPY packages/adapter-ca-cslb/src packages/adapter-ca-cslb/src
COPY packages/adapter-fl-dbpr/package.json packages/adapter-fl-dbpr/tsconfig.json packages/adapter-fl-dbpr/
COPY packages/adapter-fl-dbpr/src packages/adapter-fl-dbpr/src
COPY packages/adapter-il-idfpr/package.json packages/adapter-il-idfpr/tsconfig.json packages/adapter-il-idfpr/
COPY packages/adapter-il-idfpr/src packages/adapter-il-idfpr/src
COPY packages/adapter-in-pla/package.json packages/adapter-in-pla/tsconfig.json packages/adapter-in-pla/
COPY packages/adapter-in-pla/src packages/adapter-in-pla/src
COPY packages/adapter-mn-dli/package.json packages/adapter-mn-dli/tsconfig.json packages/adapter-mn-dli/
COPY packages/adapter-mn-dli/src packages/adapter-mn-dli/src
COPY packages/adapter-or-ccb/package.json packages/adapter-or-ccb/tsconfig.json packages/adapter-or-ccb/
COPY packages/adapter-or-ccb/src packages/adapter-or-ccb/src
COPY packages/adapter-tx-tdlr/package.json packages/adapter-tx-tdlr/tsconfig.json packages/adapter-tx-tdlr/
COPY packages/adapter-tx-tdlr/src packages/adapter-tx-tdlr/src
COPY packages/adapter-wa-lni/package.json packages/adapter-wa-lni/tsconfig.json packages/adapter-wa-lni/
COPY packages/adapter-wa-lni/src packages/adapter-wa-lni/src
COPY services/ingestion-worker/package.json services/ingestion-worker/tsconfig.json services/ingestion-worker/
COPY services/ingestion-worker/src services/ingestion-worker/src
COPY registry registry
RUN corepack pnpm install --frozen-lockfile
RUN corepack pnpm --filter @opentrade-registry/core build \
  && corepack pnpm --filter @opentrade-registry/adapter-ak-commerce build \
  && corepack pnpm --filter @opentrade-registry/adapter-az-roc build \
  && corepack pnpm --filter @opentrade-registry/adapter-ca-cslb build \
  && corepack pnpm --filter @opentrade-registry/adapter-fl-dbpr build \
  && corepack pnpm --filter @opentrade-registry/adapter-il-idfpr build \
  && corepack pnpm --filter @opentrade-registry/adapter-in-pla build \
  && corepack pnpm --filter @opentrade-registry/adapter-mn-dli build \
  && corepack pnpm --filter @opentrade-registry/adapter-or-ccb build \
  && corepack pnpm --filter @opentrade-registry/adapter-tx-tdlr build \
  && corepack pnpm --filter @opentrade-registry/adapter-wa-lni build \
  && corepack pnpm --filter @opentrade-registry/ingestion-worker build

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /workspace/node_modules /app/node_modules
COPY --from=build /workspace/packages/core /app/packages/core
COPY --from=build /workspace/packages/adapter-ak-commerce /app/packages/adapter-ak-commerce
COPY --from=build /workspace/packages/adapter-az-roc /app/packages/adapter-az-roc
COPY --from=build /workspace/packages/adapter-ca-cslb /app/packages/adapter-ca-cslb
COPY --from=build /workspace/packages/adapter-fl-dbpr /app/packages/adapter-fl-dbpr
COPY --from=build /workspace/packages/adapter-il-idfpr /app/packages/adapter-il-idfpr
COPY --from=build /workspace/packages/adapter-in-pla /app/packages/adapter-in-pla
COPY --from=build /workspace/packages/adapter-mn-dli /app/packages/adapter-mn-dli
COPY --from=build /workspace/packages/adapter-or-ccb /app/packages/adapter-or-ccb
COPY --from=build /workspace/packages/adapter-tx-tdlr /app/packages/adapter-tx-tdlr
COPY --from=build /workspace/packages/adapter-wa-lni /app/packages/adapter-wa-lni
COPY --from=build /workspace/services/ingestion-worker /app/services/ingestion-worker
COPY --from=build /workspace/registry /app/registry
WORKDIR /app/services/ingestion-worker
USER node
CMD ["node", "dist/main.js"]
