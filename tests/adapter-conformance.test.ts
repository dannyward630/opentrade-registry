import { arizonaRocContractorsAdapter } from "@opentrade-registry/adapter-az-roc";
import { californiaCslbContractorsAdapter } from "@opentrade-registry/adapter-ca-cslb";
import {
  floridaDbprAsbestosAdapter,
  floridaDbprConstructionAdapter,
  floridaDbprElectricalAdapter,
} from "@opentrade-registry/adapter-fl-dbpr";
import { minnesotaDliLicensesRegistrationsAdapter } from "@opentrade-registry/adapter-mn-dli";
import { oregonCcbActiveLicensesAdapter } from "@opentrade-registry/adapter-or-ccb";
import { texasTdlrAllLicensesAdapter } from "@opentrade-registry/adapter-tx-tdlr";
import { washingtonLniContractorsAdapter } from "@opentrade-registry/adapter-wa-lni";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { OpenTradeRegistry } from "@opentrade-registry/registry";
import { describe, expect, it } from "vitest";
import { expectAdapterConforms, type AdapterConformanceCase } from "./helpers/adapter-conformance.js";

const adapterCases: AdapterConformanceCase[] = [
  {
    adapter: arizonaRocContractorsAdapter,
    registryPath: "registry/sources/us/az/roc-contractors.json",
    expectedFixtureRecordCount: 6,
  },
  {
    adapter: californiaCslbContractorsAdapter,
    registryPath: "registry/sources/us/ca/cslb-contractors.json",
    expectedFixtureRecordCount: 6,
  },
  {
    adapter: floridaDbprConstructionAdapter,
    registryPath: "registry/sources/us/fl/dbpr-construction.json",
    expectedFixtureRecordCount: 5,
  },
  {
    adapter: floridaDbprElectricalAdapter,
    registryPath: "registry/sources/us/fl/dbpr-electrical-contractors.json",
    expectedFixtureRecordCount: 2,
  },
  {
    adapter: floridaDbprAsbestosAdapter,
    registryPath: "registry/sources/us/fl/dbpr-asbestos-contractors.json",
    expectedFixtureRecordCount: 2,
  },
  {
    adapter: minnesotaDliLicensesRegistrationsAdapter,
    registryPath: "registry/sources/us/mn/dli-licenses-registrations.json",
    expectedFixtureRecordCount: 6,
  },
  {
    adapter: oregonCcbActiveLicensesAdapter,
    registryPath: "registry/sources/us/or/ccb-active-licenses.json",
    expectedFixtureRecordCount: 5,
  },
  {
    adapter: texasTdlrAllLicensesAdapter,
    registryPath: "registry/sources/us/tx/tdlr-all-licenses.json",
    expectedFixtureRecordCount: 5,
  },
  {
    adapter: washingtonLniContractorsAdapter,
    registryPath: "registry/sources/us/wa/lni-contractors.json",
    expectedFixtureRecordCount: 6,
  },
];

const csvFixtures = new Map([
  [arizonaRocContractorsAdapter.sourceId, "packages/adapter-az-roc/fixtures/contractor-license-sample.csv"],
  [californiaCslbContractorsAdapter.sourceId, "packages/adapter-ca-cslb/fixtures/contractors-master-sample.csv"],
  [floridaDbprConstructionAdapter.sourceId, "packages/adapter-fl-dbpr/fixtures/construction-license-sample.csv"],
  [floridaDbprElectricalAdapter.sourceId, "packages/adapter-fl-dbpr/fixtures/electrical-license-sample.csv"],
  [floridaDbprAsbestosAdapter.sourceId, "packages/adapter-fl-dbpr/fixtures/asbestos-license-sample.csv"],
  [minnesotaDliLicensesRegistrationsAdapter.sourceId, "packages/adapter-mn-dli/fixtures/licenses-registrations-sample.csv"],
  [oregonCcbActiveLicensesAdapter.sourceId, "packages/adapter-or-ccb/fixtures/active-licenses-sample.csv"],
  [texasTdlrAllLicensesAdapter.sourceId, "packages/adapter-tx-tdlr/fixtures/all-licenses-sample.csv"],
  [washingtonLniContractorsAdapter.sourceId, "packages/adapter-wa-lni/fixtures/contractor-license-sample.csv"],
]);

describe("implemented adapter conformance", () => {
  for (const adapterCase of adapterCases) {
    it(`${adapterCase.adapter.sourceId} exposes metadata and normalizes fixture records`, async () => {
      await expectAdapterConforms(adapterCase);
    });

    it(`${adapterCase.adapter.sourceId} isolates a malformed CSV row`, async () => {
      const fixturePath = csvFixtures.get(adapterCase.adapter.sourceId);
      if (!fixturePath) throw new Error(`Missing CSV conformance fixture for ${adapterCase.adapter.sourceId}`);
      const directory = await mkdtemp(join(tmpdir(), "opentrade-adapter-csv-"));
      const malformedPath = join(directory, "malformed.csv");
      try {
        const lines = (await readFile(join(process.cwd(), fixturePath), "utf8")).trim().split("\n");
        const insertionIndex = adapterCase.adapter.sourceId === floridaDbprConstructionAdapter.sourceId ? 1 : 1;
        lines.splice(insertionIndex, 0, '"unterminated');
        await writeFile(malformedPath, `${lines.join("\n")}\n`, "utf8");
        const result = await new OpenTradeRegistry([adapterCase.adapter]).sync({
          sourceId: adapterCase.adapter.sourceId,
          input: { mode: "file", filePath: malformedPath },
          collectRecords: true,
        });

        expect(result.status).toBe("completed");
        expect(result.records).toHaveLength(adapterCase.expectedFixtureRecordCount);
        expect(result.errors).toContainEqual(expect.objectContaining({ code: "row_parse_failed", rowNumber: 2 }));
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    });
  }
});
