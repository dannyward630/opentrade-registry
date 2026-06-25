import type { AdapterWarning, NormalizedLicenseStatus, TradeCategory } from "@opentrade/core";
import type { MinnesotaDliRow } from "./map.js";

export function normalizeMinnesotaDliStatus(row: Pick<MinnesotaDliRow, "status" | "expirationDate">): {
  normalized: NormalizedLicenseStatus;
  isCurrent: boolean | null;
} {
  const status = row.status?.toLowerCase() ?? "";

  if (status.includes("suspend")) {
    return { normalized: "suspended", isCurrent: false };
  }

  if (status.includes("revok")) {
    return { normalized: "revoked", isCurrent: false };
  }

  if (status.includes("expired")) {
    return { normalized: "expired", isCurrent: false };
  }

  if (status.includes("issued") || status.includes("active")) {
    if (!row.expirationDate) {
      return { normalized: "active", isCurrent: true };
    }

    const expiration = new Date(row.expirationDate);
    if (Number.isNaN(expiration.getTime())) {
      return { normalized: "active", isCurrent: true };
    }

    const now = new Date();
    const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const expirationUtc = Date.UTC(expiration.getUTCFullYear(), expiration.getUTCMonth(), expiration.getUTCDate());
    return expirationUtc < todayUtc ? { normalized: "expired", isCurrent: false } : { normalized: "active", isCurrent: true };
  }

  if (status.includes("pending")) {
    return { normalized: "pending", isCurrent: null };
  }

  return { normalized: "unknown", isCurrent: null };
}

export function mapMinnesotaDliTradeCategory(licenseType: string | null | undefined): TradeCategory {
  const normalized = licenseType?.toLowerCase() ?? "";

  if (normalized.includes("residential building contractor")) {
    return "residential_contracting";
  }

  if (normalized.includes("residential remodeler")) {
    return "home_improvement";
  }

  if (normalized.includes("plumb")) {
    return "plumbing";
  }

  if (normalized.includes("electrical") || normalized.includes("electrician")) {
    return "electrical";
  }

  if (normalized.includes("contractor registration")) {
    return "other";
  }

  if (normalized.includes("contractor")) {
    return "general_contracting";
  }

  return "unknown";
}

export function buildMinnesotaDliWarnings(row: MinnesotaDliRow): AdapterWarning[] {
  const warnings: AdapterWarning[] = [];

  if (!row.licenseNumber) {
    warnings.push({
      code: "missing_license_number",
      message: "Minnesota DLI row is missing a license number.",
      recordFingerprint: row.fingerprint,
    });
  }

  if (mapMinnesotaDliTradeCategory(row.licenseType) === "unknown") {
    warnings.push({
      code: "unknown_license_type",
      message: `Minnesota DLI license type is not categorized yet: ${row.licenseType || "(blank)"}.`,
      recordFingerprint: row.fingerprint,
    });
  }

  if (!row.expirationDate) {
    warnings.push({
      code: "missing_or_unparsed_expiration_date",
      message: "Minnesota DLI row is missing a parseable expiration date.",
      recordFingerprint: row.fingerprint,
    });
  }

  if (row.disciplineIndicator && !["N", "NO"].includes(row.disciplineIndicator.toUpperCase())) {
    warnings.push({
      code: "discipline_indicator_present",
      message: `Minnesota DLI row includes a discipline indicator value: ${row.disciplineIndicator}.`,
      recordFingerprint: row.fingerprint,
    });
  }

  return warnings;
}
