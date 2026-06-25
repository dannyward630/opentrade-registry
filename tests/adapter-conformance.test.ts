import { floridaDbprConstructionAdapter } from "@opentrade/adapter-fl-dbpr";
import { oregonCcbActiveLicensesAdapter } from "@opentrade/adapter-or-ccb";
import { texasTdlrAllLicensesAdapter } from "@opentrade/adapter-tx-tdlr";
import { washingtonLniContractorsAdapter } from "@opentrade/adapter-wa-lni";
import { describe, it } from "vitest";
import { expectAdapterConforms, type AdapterConformanceCase } from "./helpers/adapter-conformance.js";

const adapterCases: AdapterConformanceCase[] = [
  {
    adapter: floridaDbprConstructionAdapter,
    registryPath: "registry/sources/us/fl/dbpr-construction.json",
    expectedFixtureRecordCount: 5,
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

describe("implemented adapter conformance", () => {
  for (const adapterCase of adapterCases) {
    it(`${adapterCase.adapter.sourceId} exposes metadata and normalizes fixture records`, async () => {
      await expectAdapterConforms(adapterCase);
    });
  }
});
