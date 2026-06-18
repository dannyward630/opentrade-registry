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
      "@opentrade/core": resolve(rootDir, "packages/core/src/index.ts"),
      "@opentrade/adapter-fl-dbpr": resolve(rootDir, "packages/adapter-fl-dbpr/src/index.ts"),
    },
  },
});

