import { describe, expect, it } from "vitest";
import { buildFingerprint, canonicalTradeLicenseRecordSchema } from "@opentrade-registry/core";
import {
  classifyIndianaPlaLicenseRelevance,
  indianaPlaProfessionalLicensesAdapter,
  mapIndianaPlaTradeCategory,
  normalizeIndianaPlaRecord,
  normalizeIndianaPlaStatus,
  parseIndianaPlaCsvRow,
} from "../src/index.js";

describe("Indiana PLA mapping", () => {
  it("maps construction-relevant rows to canonical records", () => {
    const row = parseIndianaPlaCsvRow(
      "PC12300001,Plumbing Contractor,Active,Hoosier Pipe Works LLC,,100 Market St,,Indianapolis,IN,46204,Marion,3175550100,01/15/2020,12/31/2099,Plumbing Commission",
    );
    const canonical = normalizeIndianaPlaRecord({
      sourceId: indianaPlaProfessionalLicensesAdapter.sourceId,
      sourceUrl: "https://mylicense.in.gov/everification/",
      record: row,
      rowNumber: 1,
      fetchedAt: "2026-06-26T00:00:00.000Z",
      sourceLastModifiedAt: null,
      fingerprint: buildFingerprint(row.raw),
      warnings: [],
    });

    expect(canonicalTradeLicenseRecordSchema.parse(canonical)).toBeDefined();
    expect(canonical.sourceId).toBe("us.in.pla.professional_licenses");
    expect(canonical.jurisdiction.state).toBe("IN");
    expect(canonical.license.tradeCategories).toEqual(["plumbing"]);
    expect(canonical.status.normalized).toBe("active");
    expect(canonical.status.isCurrent).toBe(true);
    expect(canonical.identity.businessName).toBe("Hoosier Pipe Works LLC");
    expect(canonical.contact.addresses?.[0]?.city).toBe("Indianapolis");
    expect(canonical.source.caveats).toContain("Indiana general contractor licensing is often local and is outside this fixture adapter's scope.");
    expect(canonical.raw.fingerprint).toMatch(/^[a-f0-9]{64}$/);
  });

  it("normalizes status and trade relevance conservatively", () => {
    expect(normalizeIndianaPlaStatus({ status: "Suspended", expirationDate: "2099-12-31T00:00:00.000Z" }).normalized).toBe("suspended");
    expect(normalizeIndianaPlaStatus({ status: "Active", expirationDate: "2020-06-30T00:00:00.000Z" }).normalized).toBe("expired");
    expect(mapIndianaPlaTradeCategory("Home Improvement Contractor, Registration", "Home Improvement")).toBe("home_improvement");
    expect(mapIndianaPlaTradeCategory("Electrical Contractor", "Electrical")).toBe("electrical");
    expect(classifyIndianaPlaLicenseRelevance("Cosmetology License", "Cosmetology")).toBe("not_trade_relevant");
  });
});
