import type { AdapterWarning, NormalizedLicenseStatus, TradeCategory } from "@opentrade-registry/core";
import type { OregonCcbRow } from "./map.js";

export function normalizeOregonCcbStatus(row: OregonCcbRow): {
  normalized: NormalizedLicenseStatus;
  isCurrent: boolean | null;
} {
  if (!row.expirationDate) {
    return { normalized: "unknown", isCurrent: null };
  }

  const expiration = new Date(row.expirationDate);
  if (Number.isNaN(expiration.getTime())) {
    return { normalized: "unknown", isCurrent: null };
  }

  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const expirationUtc = Date.UTC(expiration.getUTCFullYear(), expiration.getUTCMonth(), expiration.getUTCDate());
  return expirationUtc < todayUtc ? { normalized: "expired", isCurrent: false } : { normalized: "active", isCurrent: true };
}

export function mapOregonCcbTradeCategories(row: OregonCcbRow): TradeCategory[] {
  const joined = [row.licenseType, row.endorsementText].filter(Boolean).join(" ").toLowerCase();
  const categories = new Set<TradeCategory>();

  if (joined.includes("residential")) {
    categories.add("residential_contracting");
  }

  if (joined.includes("commercial")) {
    categories.add("commercial_contracting");
  }

  if (joined.includes("general")) {
    categories.add("general_contracting");
  }

  if (joined.includes("home improvement")) {
    categories.add("home_improvement");
  }

  return categories.size > 0 ? [...categories] : ["unknown"];
}

export function buildOregonCcbWarnings(row: OregonCcbRow): AdapterWarning[] {
  const warnings: AdapterWarning[] = [];

  if (!row.licenseNumber) {
    warnings.push({
      code: "missing_license_number",
      message: "Oregon CCB row is missing a license number.",
      recordFingerprint: row.fingerprint,
    });
  }

  if (mapOregonCcbTradeCategories(row).includes("unknown")) {
    warnings.push({
      code: "unknown_license_type",
      message: `Oregon CCB license type is not categorized yet: ${row.licenseType || "(blank)"}.`,
      recordFingerprint: row.fingerprint,
    });
  }

  if (!row.expirationDate) {
    warnings.push({
      code: "missing_or_unparsed_expiration_date",
      message: "Oregon CCB row is missing a parseable expiration date.",
      recordFingerprint: row.fingerprint,
    });
  }

  return warnings;
}
