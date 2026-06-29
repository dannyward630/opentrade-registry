import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { defineConfig } from "vitest/config";

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts", "packages/**/tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@opentrade-registry/core": resolve(rootDir, "packages/core/src/index.ts"),
      "@opentrade-registry/adapter-az-roc": resolve(rootDir, "packages/adapter-az-roc/src/index.ts"),
      "@opentrade-registry/adapter-ca-cslb": resolve(rootDir, "packages/adapter-ca-cslb/src/index.ts"),
      "@opentrade-registry/adapter-fl-dbpr": resolve(rootDir, "packages/adapter-fl-dbpr/src/index.ts"),
      "@opentrade-registry/adapter-mn-dli": resolve(rootDir, "packages/adapter-mn-dli/src/index.ts"),
      "@opentrade-registry/adapter-or-ccb": resolve(rootDir, "packages/adapter-or-ccb/src/index.ts"),
      "@opentrade-registry/adapter-tx-tdlr": resolve(rootDir, "packages/adapter-tx-tdlr/src/index.ts"),
      "@opentrade-registry/adapter-wa-lni": resolve(rootDir, "packages/adapter-wa-lni/src/index.ts"),
      "@opentrade-registry/registry": resolve(rootDir, "packages/registry/src/index.ts"),
      "@opentrade-registry/storage-sqlite": resolve(rootDir, "packages/storage-sqlite/src/index.ts"),
    },
  },
});
