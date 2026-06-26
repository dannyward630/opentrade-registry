import type { AdapterWarning, NormalizedLicenseStatus, TradeCategory } from "@opentrade/core";
import type { CaliforniaCslbRow } from "./map.js";

export function normalizeCaliforniaCslbStatus(row: Pick<CaliforniaCslbRow, "status" | "expirationDate">): {
  normalized: NormalizedLicenseStatus;
  isCurrent: boolean | null;
} {
  const status = row.status?.toUpperCase() ?? "";

  if (status.includes("SUSPEND")) {
    return { normalized: "suspended", isCurrent: false };
  }

  if (status.includes("REVOK")) {
    return { normalized: "revoked", isCurrent: false };
  }

  if (status.includes("EXPIRED")) {
    return { normalized: "expired", isCurrent: false };
  }

  if (status.includes("INACTIVE")) {
    return { normalized: "inactive", isCurrent: false };
  }

  if (status.includes("ACTIVE")) {
    if (row.expirationDate && isPastDate(row.expirationDate)) {
      return { normalized: "expired", isCurrent: false };
    }

    return { normalized: "active", isCurrent: true };
  }

  return { normalized: "unknown", isCurrent: null };
}

export function mapCaliforniaCslbTradeCategories(row: Pick<CaliforniaCslbRow, "classifications">): TradeCategory[] {
  const categories = new Set<TradeCategory>();

  for (const classification of row.classifications) {
    const value = classification.toUpperCase();

    if (value.includes("GENERAL BUILDING") || /\bB\b/.test(value)) {
      categories.add("general_contracting");
    }

    if (value.includes("GENERAL ENGINEERING") || /\bA\b/.test(value)) {
      categories.add("commercial_contracting");
    }

    if (value.includes("C39") || value.includes("ROOF")) {
      categories.add("roofing");
    }

    if (value.includes("C20") || value.includes("HVAC") || value.includes("WARM-AIR") || value.includes("AIR CONDITIONING")) {
      categories.add("hvac");
    }

    if (value.includes("C36") || value.includes("PLUMB")) {
      categories.add("plumbing");
    }

    if (value.includes("C10") || value.includes("ELECTR")) {
      categories.add("electrical");
    }

    if (value.includes("C46") || value.includes("SOLAR")) {
      categories.add("solar");
    }
  }

  return categories.size > 0 ? [...categories] : ["unknown"];
}

export function buildCaliforniaCslbWarnings(row: CaliforniaCslbRow): AdapterWarning[] {
  const warnings: AdapterWarning[] = [];

  if (!row.licenseNumber) {
    warnings.push({
      code: "missing_license_number",
      message: "California CSLB row is missing a license number.",
      recordFingerprint: row.fingerprint,
    });
  }

  if (mapCaliforniaCslbTradeCategories(row).includes("unknown")) {
    warnings.push({
      code: "unknown_classification",
      message: `California CSLB classification is not categorized yet: ${row.classifications.join("; ") || "(blank)"}.`,
      recordFingerprint: row.fingerprint,
    });
  }

  if (normalizeCaliforniaCslbStatus(row).normalized === "unknown") {
    warnings.push({
      code: "unknown_status",
      message: `California CSLB status is not categorized yet: ${row.status || "(blank)"}.`,
      recordFingerprint: row.fingerprint,
    });
  }

  if (!row.expirationDate) {
    warnings.push({
      code: "missing_or_unparsed_expiration_date",
      message: "California CSLB row is missing a parseable expiration date.",
      recordFingerprint: row.fingerprint,
    });
  }

  return warnings;
}

function isPastDate(value: string): boolean {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const dateUtc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return dateUtc < todayUtc;
}

