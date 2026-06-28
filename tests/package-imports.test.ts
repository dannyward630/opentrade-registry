import { describe, expect, it } from "vitest";
import {
  buildFingerprint,
  buildSourceReadiness,
  canonicalTradeLicenseRecordSchema,
  adapterMaturitySchema,
  adapterQualityLevelSchema,
  getSourceResearchOutcome,
  isUnimplementedBulkAdapterCandidate,
  normalizeLicenseNumber,
  parseCsvLine,
  sourceDiscoveryStatusSchema,
  sourceRegistryEntrySchema,
} from "@opentrade/core";
import {
  arizonaRocContractorsAdapter,
  AZ_ROC_CONTRACTORS_SOURCE_ID,
  normalizeArizonaRocStatus,
} from "@opentrade/adapter-az-roc";
import {
  californiaCslbContractorsAdapter,
  CA_CSLB_CONTRACTORS_SOURCE_ID,
  normalizeCaliforniaCslbStatus,
} from "@opentrade/adapter-ca-cslb";
import {
  FL_DBPR_CONSTRUCTION_SOURCE_ID,
  floridaDbprConstructionAdapter,
  normalizeDbprStatus,
} from "@opentrade/adapter-fl-dbpr";
import {
  minnesotaDliLicensesRegistrationsAdapter,
  MN_DLI_LICENSES_REGISTRATIONS_SOURCE_ID,
  normalizeMinnesotaDliStatus,
} from "@opentrade/adapter-mn-dli";
import {
  normalizeOregonCcbStatus,
  oregonCcbActiveLicensesAdapter,
  OR_CCB_ACTIVE_LICENSES_SOURCE_ID,
} from "@opentrade/adapter-or-ccb";
import {
  texasTdlrAllLicensesAdapter,
  TX_TDLR_ALL_LICENSES_SOURCE_ID,
  normalizeTexasTdlrStatus,
} from "@opentrade/adapter-tx-tdlr";
import {
  normalizeWashingtonLniStatus,
  washingtonLniContractorsAdapter,
  WA_LNI_CONTRACTORS_SOURCE_ID,
} from "@opentrade/adapter-wa-lni";
import {
  buildInsertLicenseRecordSql,
  SQLITE_LICENSE_RECORD_TABLE,
  SQLITE_SCHEMA_VERSION,
} from "@opentrade/storage-sqlite";
import { OpenTradeRegistry, downloadOfficialSource } from "@opentrade/registry";

describe("public package imports", () => {
  it("imports stable public APIs from core and the Florida adapter", () => {
    expect(normalizeLicenseNumber("cgc-012345")).toBe("CGC012345");
    expect(parseCsvLine('"ACME, INC.",CGC012345')).toEqual(["ACME, INC.", "CGC012345"]);
    expect(buildFingerprint({ a: 1 })).toMatch(/^[a-f0-9]{64}$/);
    expect(canonicalTradeLicenseRecordSchema).toBeDefined();
    expect(sourceRegistryEntrySchema).toBeDefined();
    expect(adapterMaturitySchema.parse("registry_only")).toBe("registry_only");
    expect(adapterMaturitySchema.parse("production_ready")).toBe("production_ready");
    expect(adapterMaturitySchema.parse("blocked")).toBe("blocked");
    expect(adapterMaturitySchema.parse("deprecated")).toBe("deprecated");
    expect(adapterQualityLevelSchema.parse(4)).toBe(4);
    expect(sourceDiscoveryStatusSchema.parse("researched")).toBe("researched");
    expect(buildSourceReadiness([])).toEqual({
      sourceCount: 0,
      terminalSourceCount: 0,
      blockedSourceCount: 0,
      implementedAdapterSources: [],
      blockedSources: [],
      unimplementedBulkAdapterCandidates: [],
      downloadResearchCandidates: [],
      lookupAutomationConstraintSources: [],
      sourcesByResearchOutcome: {
        blocked: 0,
        deprecated: 0,
        local_file_adapter: 0,
        network_opt_in: 0,
        production_ready: 0,
      },
      registryOnlySourceCount: 0,
      note: expect.stringContaining("terminal"),
    });
    expect(typeof isUnimplementedBulkAdapterCandidate).toBe("function");
    expect(typeof getSourceResearchOutcome).toBe("function");
    expect(AZ_ROC_CONTRACTORS_SOURCE_ID).toBe("us.az.roc.contractors");
    expect(arizonaRocContractorsAdapter.sourceId).toBe("us.az.roc.contractors");
    expect(normalizeArizonaRocStatus({ status: "Suspended", expirationDate: "2099-12-31T00:00:00.000Z" }).normalized).toBe("suspended");
    expect(CA_CSLB_CONTRACTORS_SOURCE_ID).toBe("us.ca.cslb.contractors");
    expect(californiaCslbContractorsAdapter.sourceId).toBe("us.ca.cslb.contractors");
    expect(normalizeCaliforniaCslbStatus({ status: "Suspended", expirationDate: "2099-12-31T00:00:00.000Z" }).normalized).toBe("suspended");
    expect(FL_DBPR_CONSTRUCTION_SOURCE_ID).toBe("us.fl.dbpr.construction");
    expect(floridaDbprConstructionAdapter.sourceId).toBe("us.fl.dbpr.construction");
    expect(normalizeDbprStatus({ primaryStatusCode: "S", secondaryStatusCode: "A" }).normalized).toBe("suspended");
    expect(MN_DLI_LICENSES_REGISTRATIONS_SOURCE_ID).toBe("us.mn.dli.licenses_registrations");
    expect(minnesotaDliLicensesRegistrationsAdapter.sourceId).toBe("us.mn.dli.licenses_registrations");
    expect(normalizeMinnesotaDliStatus({ status: "Issued", expirationDate: "2099-12-31T00:00:00.000Z" }).normalized).toBe("active");
    expect(OR_CCB_ACTIVE_LICENSES_SOURCE_ID).toBe("us.or.ccb.active_licenses");
    expect(oregonCcbActiveLicensesAdapter.sourceId).toBe("us.or.ccb.active_licenses");
    expect(
      normalizeOregonCcbStatus({
        expirationDate: "2099-12-31T00:00:00.000Z",
      } as Parameters<typeof normalizeOregonCcbStatus>[0]).normalized,
    ).toBe("active");
    expect(TX_TDLR_ALL_LICENSES_SOURCE_ID).toBe("us.tx.tdlr.all_licenses");
    expect(texasTdlrAllLicensesAdapter.sourceId).toBe("us.tx.tdlr.all_licenses");
    expect(normalizeTexasTdlrStatus({ expirationDate: "2099-12-31T00:00:00.000Z" }).normalized).toBe("active");
    expect(WA_LNI_CONTRACTORS_SOURCE_ID).toBe("us.wa.lni.contractors");
    expect(washingtonLniContractorsAdapter.sourceId).toBe("us.wa.lni.contractors");
    expect(
      normalizeWashingtonLniStatus({
        statusCode: "S",
        statusLabel: "SUSPENDED",
        expirationDate: "2099-12-31T00:00:00.000Z",
      } as Parameters<typeof normalizeWashingtonLniStatus>[0]).normalized,
    ).toBe("suspended");
    expect(SQLITE_SCHEMA_VERSION).toBe(4);
    expect(buildInsertLicenseRecordSql()).toContain(`insert into ${SQLITE_LICENSE_RECORD_TABLE}`);
    expect(new OpenTradeRegistry([]).adapters.size).toBe(0);
    expect(typeof downloadOfficialSource).toBe("function");
  });
});
