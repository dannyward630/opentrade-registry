FROM node:24-bookworm-slim AS build
WORKDIR /workspace
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/core/package.json packages/core/tsconfig.json packages/core/
COPY packages/core/src packages/core/src
COPY services/record-api/package.json services/record-api/tsconfig.json services/record-api/
COPY services/record-api/src services/record-api/src
RUN corepack pnpm install --frozen-lockfile
RUN corepack pnpm --filter @opentrade-registry/core build && corepack pnpm --filter @opentrade-registry/record-api build

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=8787 OPENTRADE_REGISTRY_ROOT=/app/registry
WORKDIR /app
COPY --from=build /workspace/node_modules /app/node_modules
COPY --from=build /workspace/packages/core /app/packages/core
COPY --from=build /workspace/services/record-api /app/services/record-api
COPY registry /app/registry
WORKDIR /app/services/record-api
USER node
EXPOSE 8787
CMD ["node", "dist/server.js"]
