import { floridaDbprConstructionAdapter } from "@opentrade/adapter-fl-dbpr";
import { texasTdlrAllLicensesAdapter } from "@opentrade/adapter-tx-tdlr";
import { washingtonLniContractorsAdapter } from "@opentrade/adapter-wa-lni";
import { describe, it } from "vitest";
import { expectAdapterConforms, type AdapterConformanceCase } from "./helpers/adapter-conformance.js";

const adapterCases: AdapterConformanceCase[] = [
  {
    adapter: floridaDbprConstructionAdapter,
    registryPath: "registry/sources/us/fl/dbpr-construction.json",
  },
  {
    adapter: texasTdlrAllLicensesAdapter,
    registryPath: "registry/sources/us/tx/tdlr-all-licenses.json",
  },
  {
    adapter: washingtonLniContractorsAdapter,
    registryPath: "registry/sources/us/wa/lni-contractors.json",
  },
];

describe("implemented adapter conformance", () => {
  for (const adapterCase of adapterCases) {
    it(`${adapterCase.adapter.sourceId} exposes metadata and normalizes fixture records`, async () => {
      await expectAdapterConforms(adapterCase);
    });
  }
});
