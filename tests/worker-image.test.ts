import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const adapterPackages = [
  "adapter-ak-commerce",
  "adapter-az-roc",
  "adapter-ca-cslb",
  "adapter-fl-dbpr",
  "adapter-il-idfpr",
  "adapter-in-pla",
  "adapter-mn-dli",
  "adapter-or-ccb",
  "adapter-tx-tdlr",
  "adapter-wa-lni",
];

describe("ingestion worker image boundary", () => {
  it("includes every working adapter in build and runtime stages", async () => {
    const dockerfile = await readFile(join(process.cwd(), "services", "ingestion-worker", "Dockerfile"), "utf8");
    for (const adapter of adapterPackages) {
      expect(dockerfile).toContain(`packages/${adapter}/src`);
      expect(dockerfile).toContain(`/workspace/packages/${adapter}`);
      expect(dockerfile).toContain(`@opentrade-registry/${adapter} build`);
    }
  });

  it("excludes local dependencies, generated output, and deployment secrets", async () => {
    const dockerignore = await readFile(join(process.cwd(), ".dockerignore"), "utf8");
    expect(dockerignore).toContain("node_modules");
    expect(dockerignore).toContain("infra/.env");
    expect(dockerignore).toContain("**/dist");
    expect(dockerignore).toContain("*.sqlite");
  });
});
