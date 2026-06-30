import { describe, expect, it } from "vitest";
import {
  OPENTRADE_V2_ROUTES,
  recordApiErrorResponseV2Schema,
  recordApiSearchResponseV2Schema,
  recordApiVerificationResponseV2Schema,
} from "@opentrade-registry/core";

describe("v2 hosted API contracts", () => {
  it("freezes route identifiers", () => {
    expect(OPENTRADE_V2_ROUTES).toEqual({
      sources: "/api/v2/sources",
      licenseSearch: "/api/v2/licenses/search",
      licenseById: "/api/v2/licenses/:id",
      verifications: "/api/v2/verifications",
      verificationById: "/api/v2/verifications/:jobId",
      developerKeys: "/api/v2/developer/keys",
      developerKeyById: "/api/v2/developer/keys/:id",
    });
  });

  it("validates search and neutral verification responses", () => {
    expect(recordApiSearchResponseV2Schema.safeParse({
      apiVersion: "2.0",
      records: [storedRecord()],
      nextCursor: null,
    }).success).toBe(true);
    expect(recordApiVerificationResponseV2Schema.safeParse({
      apiVersion: "2.0",
      result: "not_found",
      checkedAt: "2026-07-01T00:00:00.000Z",
      reasons: ["No matching record was found in this source as of the checked time."],
      caveats: ["Coverage is limited to the named source."],
    }).success).toBe(true);
  });

  it("rejects unversioned errors and unpublished record dispositions", () => {
    expect(recordApiErrorResponseV2Schema.safeParse({ error: { code: "not_found", message: "Missing." } }).success).toBe(false);
    expect(recordApiSearchResponseV2Schema.safeParse({
      apiVersion: "2.0",
      records: [{ ...storedRecord(), publicationDisposition: "withheld" }],
      nextCursor: null,
    }).success).toBe(false);
  });
});

function storedRecord() {
  return {
    id: "record-1",
    sourceId: "us.fl.dbpr.construction",
    sourceSnapshotId: "snapshot-1",
    recordVersion: "version-1",
    jurisdictionState: "FL",
    licenseNumber: "CGC1234567",
    licenseNumberNormalized: "CGC1234567",
    businessName: "EXAMPLE BUILDERS LLC",
    licenseeName: null,
    normalizedStatus: "active",
    tradeCategories: ["general_contracting"],
    observedAt: "2026-07-01T00:00:00.000Z",
    publicationDisposition: "allowed",
    sensitivityLevel: "business_only",
    sourceUrl: "https://example.gov/licenses.csv",
    caveats: ["Coverage is limited to the named source."],
    canonicalRecord: { schemaVersion: "2.0" },
  };
}
