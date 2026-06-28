import type { AdapterWarning, NormalizedLicenseStatus, TradeCategory } from "@opentrade-registry/core";
import type { WashingtonLniRow } from "./map.js";

export function normalizeWashingtonLniStatus(row: WashingtonLniRow): {
  normalized: NormalizedLicenseStatus;
  isCurrent: boolean | null;
} {
  const statusCode = row.statusCode?.toUpperCase() ?? "";
  const statusLabel = row.statusLabel?.toUpperCase() ?? "";

  if (statusCode === "S" || statusLabel.includes("SUSPEND")) {
    return { normalized: "suspended", isCurrent: false };
  }

  if (row.expirationDate && isPastDate(row.expirationDate)) {
    return { normalized: "expired", isCurrent: false };
  }

  if (statusCode === "A" || statusLabel.includes("ACTIVE")) {
    return { normalized: "active", isCurrent: true };
  }

  return { normalized: "unknown", isCurrent: null };
}

export function mapWashingtonLniTradeCategories(row: WashingtonLniRow): TradeCategory[] {
  const values = [row.specialtyCode1, row.specialtyLabel1, row.specialtyCode2, row.specialtyLabel2]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLowerCase());
  const joined = values.join(" ");
  const categories = new Set<TradeCategory>();

  if (joined.includes("general")) {
    categories.add("general_contracting");
  }

  if (joined.includes("roof")) {
    categories.add("roofing");
  }

  if (joined.includes("heating") || joined.includes("ventilation") || joined.includes("air conditioning") || joined.includes("hvac")) {
    categories.add("hvac");
  }

  if (joined.includes("electrical")) {
    categories.add("electrical");
  }

  if (joined.includes("plumb")) {
    categories.add("plumbing");
  }

  return categories.size > 0 ? [...categories] : ["unknown"];
}

export function buildWashingtonLniWarnings(row: WashingtonLniRow): AdapterWarning[] {
  const warnings: AdapterWarning[] = [];

  if (!row.licenseNumber) {
    warnings.push({
      code: "missing_license_number",
      message: "Washington L&I row is missing a contractor license number.",
      recordFingerprint: row.fingerprint,
    });
  }

  if (mapWashingtonLniTradeCategories(row).includes("unknown")) {
    warnings.push({
      code: "unknown_specialty",
      message: `Washington L&I specialty is not categorized yet: ${row.specialtyCode1 || "(blank)"} ${row.specialtyLabel1 || ""}`.trim(),
      recordFingerprint: row.fingerprint,
    });
  }

  if (normalizeWashingtonLniStatus(row).normalized === "unknown") {
    warnings.push({
      code: "unknown_status",
      message: `Washington L&I status is not categorized yet: ${row.statusCode || "(blank)"} ${row.statusLabel || ""}`.trim(),
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
