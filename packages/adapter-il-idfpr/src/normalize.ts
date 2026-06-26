import type { AdapterWarning, NormalizedLicenseStatus, TradeCategory } from "@opentrade/core";
import type { IllinoisIdfprRow } from "./map.js";

export type IllinoisIdfprLicenseRelevance = "trade_relevant" | "not_trade_relevant" | "unknown";

export function normalizeIllinoisIdfprStatus(row: IllinoisIdfprRow): {
  normalized: NormalizedLicenseStatus;
  isCurrent: boolean | null;
} {
  const status = row.status.trim().toLowerCase();

  if (status.includes("suspend")) {
    return { normalized: "suspended", isCurrent: false };
  }

  if (status.includes("revok")) {
    return { normalized: "revoked", isCurrent: false };
  }

  if (status.includes("probation")) {
    return { normalized: "probation", isCurrent: true };
  }

  if (status.includes("pending") || status.includes("review")) {
    return { normalized: "pending", isCurrent: null };
  }

  if (status.includes("inactive")) {
    return { normalized: "inactive", isCurrent: false };
  }

  if (status.includes("expired")) {
    return { normalized: "expired", isCurrent: false };
  }

  if (status.includes("active")) {
    return expirationStatus(row.expirationDate, "active");
  }

  return { normalized: "unknown", isCurrent: null };
}

export function mapIllinoisIdfprTradeCategories(row: IllinoisIdfprRow): TradeCategory[] {
  const text = [row.professionName, row.licenseType, row.board]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLowerCase();

  if (text.includes("roof")) {
    return ["roofing"];
  }

  return ["unknown"];
}

export function classifyIllinoisIdfprLicenseRelevance(row: IllinoisIdfprRow): IllinoisIdfprLicenseRelevance {
  const text = [row.professionName, row.licenseType, row.board]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLowerCase();

  if (!text.trim()) {
    return "unknown";
  }

  if (text.includes("roof")) {
    return "trade_relevant";
  }

  if (text.includes("engineer") || text.includes("nursing") || text.includes("cosmetology") || text.includes("real estate")) {
    return "not_trade_relevant";
  }

  return "unknown";
}

export function buildIllinoisIdfprWarnings(row: IllinoisIdfprRow): AdapterWarning[] {
  const warnings: AdapterWarning[] = [];
  const relevance = classifyIllinoisIdfprLicenseRelevance(row);

  if (!row.licenseNumber) {
    warnings.push({
      code: "missing_license_number",
      message: "Illinois IDFPR row is missing a license number.",
      recordFingerprint: row.fingerprint,
    });
  }

  if (mapIllinoisIdfprTradeCategories(row).includes("unknown")) {
    warnings.push({
      code: "unknown_license_type",
      message: `Illinois IDFPR license type is not categorized yet: ${row.licenseType || "(blank)"}.`,
      recordFingerprint: row.fingerprint,
    });
  }

  if (normalizeIllinoisIdfprStatus(row).normalized === "unknown") {
    warnings.push({
      code: "unknown_status",
      message: `Illinois IDFPR status is not categorized yet: ${row.status || "(blank)"}.`,
      recordFingerprint: row.fingerprint,
    });
  }

  if (relevance === "not_trade_relevant") {
    warnings.push({
      code: "non_trade_license_type",
      message: `Illinois IDFPR license type appears outside roofing-contractor scope: ${row.licenseType}.`,
      recordFingerprint: row.fingerprint,
    });
  }

  if (!row.expirationDate) {
    warnings.push({
      code: "missing_or_unparsed_expiration_date",
      message: "Illinois IDFPR row is missing a parseable expiration date.",
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
