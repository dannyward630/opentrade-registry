import { readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { afterAll, describe, expect, it } from "vitest";

const outputDirectory = join(process.cwd(), "wiki-export");

afterAll(() => {
  rmSync(outputDirectory, { recursive: true, force: true });
});

describe("GitHub Wiki generation", () => {
  it("mirrors canonical docs with deterministic local page names and source links", () => {
    const result = spawnSync(process.execPath, ["scripts/generate-wiki.mjs"], {
      cwd: process.cwd(),
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    const expectedPageCount = countMarkdownFiles(join(process.cwd(), "docs")) + 1;
    expect(result.stdout).toContain(`Generated ${expectedPageCount} wiki pages`);

    const pages = readdirSync(outputDirectory).filter((file) => file.endsWith(".md")).sort();
    expect(pages).toHaveLength(expectedPageCount);
    expect(pages).toContain("Home.md");
    expect(pages).toContain("adapters--arizona-roc.md");

    const home = readFileSync(join(outputDirectory, "Home.md"), "utf8");
    expect(home).toContain("[Architecture](architecture)");
    expect(home).toContain("generated from the repository's canonical `/docs` directory");

    const architecture = readFileSync(join(outputDirectory, "architecture.md"), "utf8");
    expect(architecture).toContain("https://github.com/dannyward630/opentrade-registry/blob/main/docs/architecture.md");
  });
});

function countMarkdownFiles(directory: string): number {
  return readdirSync(directory).reduce((count, entry) => {
    const path = join(directory, entry);
    return count + (statSync(path).isDirectory() ? countMarkdownFiles(path) : entry.endsWith(".md") ? 1 : 0);
  }, 0);
}
