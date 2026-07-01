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
    expect(result.stdout).toContain("Built OpenTrade web status page with 59 sources.");

    const distDir = join(process.cwd(), "apps", "web", "dist");
    const sources = JSON.parse(await readFile(join(distDir, "sources.json"), "utf8")) as Array<{ id: string }>;
    const readiness = JSON.parse(await readFile(join(distDir, "readiness.json"), "utf8")) as {
      sourceCount: number;
      implementedAdapterSources: Array<{ id: string }>;
      unimplementedBulkAdapterCandidates: Array<{ id: string }>;
      registryOnlySourceCount: number;
      note: string;
    };
    const territoryCoverage = JSON.parse(await readFile(join(distDir, "territory-coverage.json"), "utf8")) as {
      territories: Array<{ territory: string; sourceIds: string[] }>;
    };
    const html = await readFile(join(distDir, "index.html"), "utf8");

    expect(sources).toHaveLength(59);
    expect(sources.map((source) => source.id)).toContain("us.pr.daco.contractors");
    expect(readiness.sourceCount).toBe(59);
    expect(readiness.registryOnlySourceCount).toBe(0);
    expect(readiness.terminalSourceCount).toBe(59);
    expect(readiness.blockedSourceCount).toBe(50);
    expect(readiness.implementedAdapterSources.map((source) => source.id)).toEqual([
      "us.az.roc.contractors",
      "us.ca.cslb.contractors",
      "us.fl.dbpr.asbestos_contractors",
      "us.fl.dbpr.construction",
      "us.fl.dbpr.electrical_contractors",
      "us.mn.dli.licenses_registrations",
      "us.or.ccb.active_licenses",
      "us.tx.tdlr.all_licenses",
      "us.wa.lni.contractors",
    ]);
    expect(readiness.unimplementedBulkAdapterCandidates.map((source) => source.id)).toEqual([]);
    expect(readiness.note).toContain("terminal implementation or blocker outcome");
    expect(territoryCoverage.territories.map((entry) => entry.territory)).toEqual(["AS", "GU", "MP", "PR", "VI"]);
    expect(territoryCoverage.territories.find((entry) => entry.territory === "AS")?.sourceIds).toEqual([
      "us.as.doc.business_licenses",
    ]);
    expect(html).toContain("<strong>5</strong> territories with entries");
    expect(html).toContain("<strong>0</strong> adapter candidates");
    expect(html).toContain("Readiness API");
    expect(html).toContain("Static readiness snapshot");
    expect(html).toContain("<strong>56</strong> coverage rows");
    expect(html).toContain("Static territory coverage snapshot");
  });
});
