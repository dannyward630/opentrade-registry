import type { AdapterWarning, NormalizedLicenseStatus, TradeCategory } from "@opentrade-registry/core";
import { OCCUPATION_LABELS, PRIMARY_STATUS_LABELS, SECONDARY_STATUS_LABELS } from "./constants.js";
import type { DbprConstructionRow } from "./map.js";

export function normalizeDbprStatus(input: {
  primaryStatusCode: string | null;
  secondaryStatusCode: string | null;
  expirationDate?: string | null;
}): { normalized: NormalizedLicenseStatus; isCurrent: boolean | null } {
  if (input.primaryStatusCode === "S") {
    return { normalized: "suspended", isCurrent: false };
  }

  if (input.primaryStatusCode === "P") {
    return { normalized: "probation", isCurrent: true };
  }

  if (input.primaryStatusCode === "C" && input.secondaryStatusCode === "I") {
    return { normalized: "inactive", isCurrent: false };
  }

  if (input.primaryStatusCode === "C" && isExpiredIsoDate(input.expirationDate)) {
    return { normalized: "expired", isCurrent: false };
  }

  if (input.primaryStatusCode === "C" && input.secondaryStatusCode === "A") {
    return { normalized: "active", isCurrent: true };
  }

  return { normalized: "unknown", isCurrent: null };
}

export function mapOccupationToTradeCategory(occupationCode: string | null): TradeCategory {
  switch (occupationCode) {
    case "CJC":
      return "asbestos";
    case "EC":
    case "ER":
      return "electrical";
    case "CGC":
    case "RG":
      return "general_contracting";
    case "CBC":
    case "RB":
      return "commercial_contracting";
    case "CRC":
    case "RR":
      return "residential_contracting";
    case "CCC":
    case "RC":
      return "roofing";
    case "CAC":
    case "RA":
      return "hvac";
    case "CFC":
    case "RF":
      return "plumbing";
    case "CMC":
    case "RM":
      return "mechanical";
    case "CVC":
    case "RV":
      return "solar";
    case "CPC":
    case "RP":
      return "pool_spa";
    case "CUC":
    case "RU":
      return "underground_utility";
    case "CSC":
    case "RS":
      return "sheet_metal";
    case "SCC":
    case "RX":
      return "other";
    default:
      return "unknown";
  }
}

export function buildDbprRecordWarnings(row: DbprConstructionRow): AdapterWarning[] {
  const warnings: AdapterWarning[] = [];

  if (!row.occupationCode || !OCCUPATION_LABELS[row.occupationCode]) {
    warnings.push({
      code: "unknown_occupation_code",
      message: `Unknown Florida DBPR occupation code: ${row.occupationCode || "(blank)"}.`,
      recordFingerprint: row.fingerprint,
    });
  }

  if (row.primaryStatusCode && !PRIMARY_STATUS_LABELS[row.primaryStatusCode]) {
    warnings.push({
      code: "unknown_primary_status_code",
      message: `Unknown Florida DBPR primary status code: ${row.primaryStatusCode}.`,
      recordFingerprint: row.fingerprint,
    });
  }

  if (row.secondaryStatusCode && !SECONDARY_STATUS_LABELS[row.secondaryStatusCode]) {
    warnings.push({
      code: "unknown_secondary_status_code",
      message: `Unknown Florida DBPR secondary status code: ${row.secondaryStatusCode}.`,
      recordFingerprint: row.fingerprint,
    });
  }

  return warnings;
}

function isExpiredIsoDate(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }

  const expiration = new Date(value);
  if (Number.isNaN(expiration.getTime())) {
    return false;
  }

  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const expirationUtc = Date.UTC(expiration.getUTCFullYear(), expiration.getUTCMonth(), expiration.getUTCDate());
  return expirationUtc < todayUtc;
}
