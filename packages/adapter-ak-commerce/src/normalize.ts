import type { AdapterWarning, NormalizedLicenseStatus, TradeCategory } from "@opentrade-registry/core";
import type { AlaskaCommerceRow } from "./map.js";

export type AlaskaCommerceLicenseRelevance = "trade_relevant" | "possibly_trade_relevant" | "not_trade_relevant" | "unknown";

export function normalizeAlaskaCommerceStatus(row: AlaskaCommerceRow): {
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
    return expirationStatus(row.expirationDate, "active");
  }

  return { normalized: "unknown", isCurrent: null };
}

export function mapAlaskaCommerceTradeCategories(row: AlaskaCommerceRow): TradeCategory[] {
  const text = [row.licenseType, row.program, row.endorsement, row.classification, row.board]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLowerCase();
  const categories = new Set<TradeCategory>();

  if (text.includes("residential")) {
    categories.add("residential_contracting");
  }

  if (text.includes("general")) {
    categories.add("general_contracting");
  }

  if (text.includes("roof")) {
    categories.add("roofing");
  }

  if (text.includes("plumb")) {
    categories.add("plumbing");
  }

  if (text.includes("electrical")) {
    categories.add("electrical");
  }

  if (text.includes("contractor") && categories.size === 0) {
    categories.add("other");
  }

  return categories.size > 0 ? [...categories] : ["unknown"];
}

export function classifyAlaskaCommerceLicenseRelevance(row: AlaskaCommerceRow): AlaskaCommerceLicenseRelevance {
  const text = [row.licenseType, row.program, row.endorsement, row.classification, row.board]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLowerCase();

  if (!text.trim()) {
    return "unknown";
  }

  if (text.includes("contractor") || text.includes("construction") || text.includes("roof") || text.includes("plumb") || text.includes("electrical")) {
    return "trade_relevant";
  }

  if (text.includes("installer") || text.includes("repair") || text.includes("mechanic")) {
    return "possibly_trade_relevant";
  }

  if (text.includes("cosmetology") || text.includes("barber") || text.includes("nursing") || text.includes("accountancy") || text.includes("real estate")) {
    return "not_trade_relevant";
  }

  return "unknown";
}

export function buildAlaskaCommerceWarnings(row: AlaskaCommerceRow): AdapterWarning[] {
  const warnings: AdapterWarning[] = [];
  const relevance = classifyAlaskaCommerceLicenseRelevance(row);

  if (!row.licenseNumber) {
    warnings.push({
      code: "missing_license_number",
      message: "Alaska CBPL row is missing a license number.",
      recordFingerprint: row.fingerprint,
    });
  }

  if (mapAlaskaCommerceTradeCategories(row).includes("unknown")) {
    warnings.push({
      code: "unknown_license_type",
      message: `Alaska CBPL license type is not categorized yet: ${row.licenseType || "(blank)"}.`,
      recordFingerprint: row.fingerprint,
    });
  }

  if (normalizeAlaskaCommerceStatus(row).normalized === "unknown") {
    warnings.push({
      code: "unknown_status",
      message: `Alaska CBPL status is not categorized yet: ${row.status || "(blank)"}.`,
      recordFingerprint: row.fingerprint,
    });
  }

  if (relevance === "not_trade_relevant") {
    warnings.push({
      code: "non_trade_license_type",
      message: `Alaska CBPL license type appears outside contractor and skilled-trade scope: ${row.licenseType}.`,
      recordFingerprint: row.fingerprint,
    });
  }

  if (!row.expirationDate) {
    warnings.push({
      code: "missing_or_unparsed_expiration_date",
      message: "Alaska CBPL row is missing a parseable expiration date.",
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
