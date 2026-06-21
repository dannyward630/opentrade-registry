import type { AdapterWarning, NormalizedLicenseStatus, TradeCategory } from "@opentrade/core";
import type { TexasTdlrRow } from "./map.js";

export type TexasTdlrLicenseRelevance = "trade_relevant" | "possibly_trade_relevant" | "not_trade_relevant" | "unknown";

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

export function classifyTexasTdlrLicenseRelevance(licenseType: string | null | undefined): TexasTdlrLicenseRelevance {
  const normalized = licenseType?.toLowerCase() ?? "";
  if (!normalized) {
    return "unknown";
  }

  if (
    normalized.includes("air conditioning") ||
    normalized.includes("refrigeration") ||
    normalized.includes("electrical") ||
    normalized.includes("electrician") ||
    normalized.includes("water well")
  ) {
    return "trade_relevant";
  }

  if (normalized.includes("contractor") || normalized.includes("technician") || normalized.includes("installer")) {
    return "possibly_trade_relevant";
  }

  if (
    normalized.includes("barber") ||
    normalized.includes("cosmetology") ||
    normalized.includes("auctioneer") ||
    normalized.includes("driver") ||
    normalized.includes("tow")
  ) {
    return "not_trade_relevant";
  }

  return "unknown";
}

export function buildTexasTdlrWarnings(row: TexasTdlrRow): AdapterWarning[] {
  const warnings: AdapterWarning[] = [];
  const relevance = classifyTexasTdlrLicenseRelevance(row.licenseType);

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

  if (relevance === "not_trade_relevant") {
    warnings.push({
      code: "non_trade_license_type",
      message: `Texas TDLR license type appears outside contractor and skilled-trade scope: ${row.licenseType}.`,
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
