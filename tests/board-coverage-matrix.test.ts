import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("generated board coverage matrix", () => {
  it("publishes all jurisdiction research gaps and the release rule", async () => {
    const markdown = await readFile(new URL("../docs/board-coverage-matrix.md", import.meta.url), "utf8");
    expect(markdown).toContain("757 trade-domain decisions still need research");
    expect(markdown).toContain("`board_complete` is blocked until this count reaches zero");
    const rows = markdown.split("\n").filter((line) => /^\| [A-Z]{2} \|/.test(line));
    expect(rows).toHaveLength(56);
  });
});
