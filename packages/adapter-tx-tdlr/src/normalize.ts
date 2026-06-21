import type { AdapterWarning, NormalizedLicenseStatus, TradeCategory } from "@opentrade/core";
import type { TexasTdlrRow } from "./map.js";

export function normalizeTexasTdlrStatus(input: { expirationDate?: string | null }): {
  normalized: NormalizedLicenseStatus;
  isCurrent: boolean | null;
} {
  if (!input.expirationDate) {
    return { normalized: "unknown", isCurrent: null };
  }

  const expiration = new Date(input.expirationDate);
  if (Number.isNaN(expiration.getTime())) {
    return { normalized: "unknown", isCurrent: null };
  }

  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const expirationUtc = Date.UTC(expiration.getUTCFullYear(), expiration.getUTCMonth(), expiration.getUTCDate());
  return expirationUtc < todayUtc ? { normalized: "expired", isCurrent: false } : { normalized: "active", isCurrent: true };
}

export function mapTexasTdlrTradeCategory(licenseType: string | null | undefined): TradeCategory {
  const normalized = licenseType?.toLowerCase() ?? "";
  if (normalized.includes("air conditioning") || normalized.includes("refrigeration")) {
    return "hvac";
  }

  if (normalized.includes("electrical") || normalized.includes("electrician")) {
    return "electrical";
  }

  if (normalized.includes("water well")) {
    return "other";
  }

  return "unknown";
}

export function buildTexasTdlrWarnings(row: TexasTdlrRow): AdapterWarning[] {
  const warnings: AdapterWarning[] = [];

  if (!row.licenseNumber) {
    warnings.push({
      code: "missing_license_number",
      message: "Texas TDLR row is missing a license number.",
      recordFingerprint: row.fingerprint,
    });
  }

  if (mapTexasTdlrTradeCategory(row.licenseType) === "unknown") {
    warnings.push({
      code: "unknown_license_type",
      message: `Texas TDLR license type is not categorized yet: ${row.licenseType || "(blank)"}.`,
      recordFingerprint: row.fingerprint,
    });
  }

  if (!row.expirationDate) {
    warnings.push({
      code: "missing_or_unparsed_expiration_date",
      message: "Texas TDLR row is missing a parseable expiration date.",
      recordFingerprint: row.fingerprint,
    });
  }

  return warnings;
}
