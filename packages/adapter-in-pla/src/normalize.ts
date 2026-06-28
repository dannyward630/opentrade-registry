import type { AdapterWarning, NormalizedLicenseStatus, TradeCategory } from "@opentrade-registry/core";
import type { IndianaPlaRow } from "./map.js";

export type IndianaPlaLicenseRelevance = "trade_relevant" | "possibly_trade_relevant" | "not_trade_relevant" | "unknown";

export function normalizeIndianaPlaStatus(input: {
  status?: string | null;
  expirationDate?: string | null;
}): {
  normalized: NormalizedLicenseStatus;
  isCurrent: boolean | null;
} {
  const status = input.status?.trim().toLowerCase() ?? "";
  if (status.includes("suspend")) {
    return { normalized: "suspended", isCurrent: false };
  }

  if (status.includes("revok")) {
    return { normalized: "revoked", isCurrent: false };
  }

  if (status.includes("probation")) {
    return { normalized: "probation", isCurrent: true };
  }

  if (status.includes("pending")) {
    return { normalized: "pending", isCurrent: null };
  }

  if (status.includes("inactive")) {
    return { normalized: "inactive", isCurrent: false };
  }

  if (status.includes("expired")) {
    return { normalized: "expired", isCurrent: false };
  }

  if (status.includes("active")) {
    return expirationStatus(input.expirationDate, "active");
  }

  return { normalized: "unknown", isCurrent: null };
}

export function mapIndianaPlaTradeCategory(licenseType: string | null | undefined, board: string | null | undefined): TradeCategory {
  const text = `${licenseType ?? ""} ${board ?? ""}`.toLowerCase();
  if (text.includes("plumb")) {
    return "plumbing";
  }

  if (text.includes("electrical") || text.includes("electrician")) {
    return "electrical";
  }

  if (text.includes("home improvement") || text.includes("remodel")) {
    return "home_improvement";
  }

  if (text.includes("manufactured home")) {
    return "other";
  }

  return "unknown";
}

export function classifyIndianaPlaLicenseRelevance(licenseType: string | null | undefined, board: string | null | undefined): IndianaPlaLicenseRelevance {
  const text = `${licenseType ?? ""} ${board ?? ""}`.toLowerCase();
  if (!text.trim()) {
    return "unknown";
  }

  if (
    text.includes("plumb") ||
    text.includes("electrical") ||
    text.includes("electrician") ||
    text.includes("home improvement") ||
    text.includes("manufactured home") ||
    text.includes("contractor") ||
    text.includes("installer")
  ) {
    return "trade_relevant";
  }

  if (text.includes("technician") || text.includes("repair")) {
    return "possibly_trade_relevant";
  }

  if (text.includes("cosmetology") || text.includes("nursing") || text.includes("accountancy") || text.includes("real estate")) {
    return "not_trade_relevant";
  }

  return "unknown";
}

export function buildIndianaPlaWarnings(row: IndianaPlaRow): AdapterWarning[] {
  const warnings: AdapterWarning[] = [];
  const relevance = classifyIndianaPlaLicenseRelevance(row.licenseType, row.board);

  if (!row.licenseNumber) {
    warnings.push({
      code: "missing_license_number",
      message: "Indiana PLA row is missing a license number.",
      recordFingerprint: row.fingerprint,
    });
  }

  if (mapIndianaPlaTradeCategory(row.licenseType, row.board) === "unknown") {
    warnings.push({
      code: "unknown_license_type",
      message: `Indiana PLA license type is not categorized yet: ${row.licenseType || "(blank)"}.`,
      recordFingerprint: row.fingerprint,
    });
  }

  if (relevance === "not_trade_relevant") {
    warnings.push({
      code: "non_trade_license_type",
      message: `Indiana PLA license type appears outside contractor and skilled-trade scope: ${row.licenseType}.`,
      recordFingerprint: row.fingerprint,
    });
  }

  if (!row.licenseStatus) {
    warnings.push({
      code: "missing_status",
      message: "Indiana PLA row is missing a license status.",
      recordFingerprint: row.fingerprint,
    });
  }

  if (!row.expirationDate) {
    warnings.push({
      code: "missing_or_unparsed_expiration_date",
      message: "Indiana PLA row is missing a parseable expiration date.",
      recordFingerprint: row.fingerprint,
    });
  }

  return warnings;
}

function expirationStatus(expirationDate: string | null | undefined, activeStatus: NormalizedLicenseStatus): {
  normalized: NormalizedLicenseStatus;
  isCurrent: boolean | null;
} {
  if (!expirationDate) {
    return { normalized: activeStatus, isCurrent: null };
  }

  const expiration = new Date(expirationDate);
  if (Number.isNaN(expiration.getTime())) {
    return { normalized: activeStatus, isCurrent: null };
  }

  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const expirationUtc = Date.UTC(expiration.getUTCFullYear(), expiration.getUTCMonth(), expiration.getUTCDate());
  return expirationUtc < todayUtc ? { normalized: "expired", isCurrent: false } : { normalized: activeStatus, isCurrent: true };
}
