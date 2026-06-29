import { describe, expect, it } from "vitest";
import {
  tradeLicenseVerificationResultV2Schema,
  type TradeLicenseSourceAdapterV2,
} from "@opentrade-registry/core";

describe("v2 adapter and verification contracts", () => {
  it("defines the v2 verification outcomes", () => {
    for (const result of [
      "indexed_match",
      "live_match",
      "not_found",
      "manual_required",
      "pending",
      "ambiguous",
      "stale",
      "source_unavailable",
    ]) {
      expect(tradeLicenseVerificationResultV2Schema.safeParse({
        schemaVersion: "2.0",
        sourceId: "us.fl.dbpr.construction",
        query: { licenseNumber: "CGC1234567" },
        result,
        warnings: [],
        reasons: [],
        checkedAt: "2026-06-29T00:00:00.000Z",
      }).success).toBe(true);
    }
  });

  it("exposes discovery and capability declarations", () => {
    expectType<TradeLicenseSourceAdapterV2["capabilities"]["automationMode"]>();
    expectType<TradeLicenseSourceAdapterV2["resolveSnapshot"]>();
  });
});

function expectType<_Value>(): void {
  // Compile-time contract assertion.
}
