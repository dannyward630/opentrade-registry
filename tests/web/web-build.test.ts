import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("web status build", () => {
  it("emits source and territory coverage snapshots from registry files", async () => {
    const result = spawnSync(process.execPath, ["apps/web/src/build.mjs"], {
      cwd: process.cwd(),
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("Built OpenTrade web status page with 56 sources.");

    const distDir = join(process.cwd(), "apps", "web", "dist");
    const sources = JSON.parse(await readFile(join(distDir, "sources.json"), "utf8")) as Array<{ id: string }>;
    const territoryCoverage = JSON.parse(await readFile(join(distDir, "territory-coverage.json"), "utf8")) as {
      territories: Array<{ territory: string; sourceIds: string[] }>;
    };
    const html = await readFile(join(distDir, "index.html"), "utf8");

    expect(sources).toHaveLength(56);
    expect(sources.map((source) => source.id)).toContain("us.pr.daco.contractors");
    expect(territoryCoverage.territories.map((entry) => entry.territory)).toEqual(["AS", "GU", "MP", "PR", "VI"]);
    expect(territoryCoverage.territories.find((entry) => entry.territory === "AS")?.sourceIds).toEqual([
      "us.as.doc.business_licenses",
    ]);
    expect(html).toContain("<strong>5</strong> territories with entries");
    expect(html).toContain("<strong>56</strong> coverage rows");
    expect(html).toContain("Static territory coverage snapshot");
  });
});
