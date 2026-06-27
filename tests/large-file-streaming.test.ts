import { createWriteStream } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { once } from "node:events";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { floridaDbprConstructionAdapter } from "@opentrade/adapter-fl-dbpr";

describe("large local-file ingestion", () => {
  it("streams 25,000 CSV rows below a 128 MiB heap-growth ceiling", async () => {
    const directory = await mkdtemp(join(tmpdir(), "opentrade-large-file-"));
    const filePath = join(directory, "large.csv");
    try {
      const output = createWriteStream(filePath, "utf8");
      for (let index = 0; index < 25_000; index += 1) {
        const license = `CGC${String(index).padStart(7, "0")}`;
        if (!output.write(`"06","CGC","FIXTURE BUILDER ${index}","","","1 TEST ST","","","TALLAHASSEE","FL","32301","37","${String(index).padStart(7, "0")}","C","A","01/01/2020","01/01/2020","12/31/2099","","","${license}",""\n`)) await once(output, "drain");
      }
      output.end();
      await once(output, "close");

      const baseline = process.memoryUsage().heapUsed;
      let maximum = baseline;
      let count = 0;
      for await (const raw of floridaDbprConstructionAdapter.streamRawRecords({ filePath, fetchedAt: "2026-06-27T00:00:00.000Z" })) {
        await floridaDbprConstructionAdapter.normalize(raw);
        count += 1;
        if (count % 1_000 === 0) maximum = Math.max(maximum, process.memoryUsage().heapUsed);
      }

      expect(count).toBe(25_000);
      expect(maximum - baseline).toBeLessThan(128 * 1024 * 1024);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }, 30_000);
});
