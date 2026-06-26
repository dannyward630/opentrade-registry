import { describe, expect, it } from "vitest";
import { getAdapter, listImplementedSourceIds, requireAdapter } from "../packages/cli/src/adapters.js";

describe("CLI adapter registry", () => {
  it("resolves implemented adapters and rejects registry-only sources", () => {
    expect(listImplementedSourceIds()).toEqual([
      "us.ca.cslb.contractors",
      "us.fl.dbpr.construction",
      "us.in.pla.professional_licenses",
      "us.mn.dli.licenses_registrations",
      "us.or.ccb.active_licenses",
      "us.tx.tdlr.all_licenses",
      "us.wa.lni.contractors",
    ]);
    expect(getAdapter("us.ca.cslb.contractors")?.sourceId).toBe("us.ca.cslb.contractors");
    expect(getAdapter("us.fl.dbpr.construction")?.sourceId).toBe("us.fl.dbpr.construction");
    expect(getAdapter("us.in.pla.professional_licenses")?.sourceId).toBe("us.in.pla.professional_licenses");
    expect(getAdapter("us.mn.dli.licenses_registrations")?.sourceId).toBe("us.mn.dli.licenses_registrations");
    expect(getAdapter("us.or.ccb.active_licenses")?.sourceId).toBe("us.or.ccb.active_licenses");
    expect(getAdapter("us.tx.tdlr.all_licenses")?.sourceId).toBe("us.tx.tdlr.all_licenses");
    expect(getAdapter("us.wa.lni.contractors")?.sourceId).toBe("us.wa.lni.contractors");
    expect(getAdapter("us.ak.commerce.construction_contractors")).toBeNull();
    expect(() => requireAdapter("us.ak.commerce.construction_contractors", "sync")).toThrow(/no sync adapter is implemented yet/i);
  });
});
