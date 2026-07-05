import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("generated board coverage matrix", () => {
  it("publishes complete terminal board coverage status", async () => {
    const markdown = await readFile(new URL("../docs/board-coverage-matrix.md", import.meta.url), "utf8");
    expect(markdown).toContain("all trade-domain decisions are terminal and evidence-backed");
    expect(markdown).toContain("The ledger is marked `board_complete`.");
    const rows = markdown.split("\n").filter((line) => /^\| [A-Z]{2} \|/.test(line));
    expect(rows).toHaveLength(56);
    expect(markdown).toContain("| MP | 14 | 0 | resolved |");
  });
});
