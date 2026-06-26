import { alaskaCommerceConstructionContractorsAdapter } from "@opentrade/adapter-ak-commerce";
import { californiaCslbContractorsAdapter } from "@opentrade/adapter-ca-cslb";
import { floridaDbprConstructionAdapter } from "@opentrade/adapter-fl-dbpr";
import { indianaPlaProfessionalLicensesAdapter } from "@opentrade/adapter-in-pla";
import { minnesotaDliLicensesRegistrationsAdapter } from "@opentrade/adapter-mn-dli";
import { oregonCcbActiveLicensesAdapter } from "@opentrade/adapter-or-ccb";
import { texasTdlrAllLicensesAdapter } from "@opentrade/adapter-tx-tdlr";
import { washingtonLniContractorsAdapter } from "@opentrade/adapter-wa-lni";
import { describe, it } from "vitest";
import { expectAdapterConforms, type AdapterConformanceCase } from "./helpers/adapter-conformance.js";

const adapterCases: AdapterConformanceCase[] = [
  {
    adapter: alaskaCommerceConstructionContractorsAdapter,
    registryPath: "registry/sources/us/ak/commerce-construction-contractors.json",
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
    adapter: indianaPlaProfessionalLicensesAdapter,
    registryPath: "registry/sources/us/in/pla-professional-licenses.json",
    expectedFixtureRecordCount: 6,
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

describe("implemented adapter conformance", () => {
  for (const adapterCase of adapterCases) {
    it(`${adapterCase.adapter.sourceId} exposes metadata and normalizes fixture records`, async () => {
      await expectAdapterConforms(adapterCase);
    });
  }
});
