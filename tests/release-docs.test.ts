import { describe, expect, it } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

describe("release documentation", () => {
  it("states the discovered public package count", async () => {
    const packageDirectories = await readdir(join(process.cwd(), "packages"));
    const manifests = await Promise.all(packageDirectories.map(async (directory) => {
      try {
        return JSON.parse(await readFile(join(process.cwd(), "packages", directory, "package.json"), "utf8")) as { private?: boolean };
      } catch {
        return null;
      }
    }));
    const publicPackageCount = manifests.filter((manifest) => manifest && manifest.private !== true).length;
    const publishing = await readFile(join(process.cwd(), "docs", "package-publishing.md"), "utf8");
    const checklist = await readFile(join(process.cwd(), "docs", "release-checklist.md"), "utf8");

    expect(publicPackageCount).toBe(11);
    expect(publishing).toContain(`${publicPackageCount} public packages`);
    expect(checklist).toContain(`all ${publicPackageCount} tarballs`);
  });
});
