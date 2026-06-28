import type { AdapterWarning, NormalizedLicenseStatus, TradeCategory } from "@opentrade-registry/core";
import type { ArizonaRocRow } from "./map.js";

export function normalizeArizonaRocStatus(row: Pick<ArizonaRocRow, "status" | "expirationDate">): { normalized: NormalizedLicenseStatus; isCurrent: boolean | null } {
  const status = row.status?.toUpperCase() ?? "";
  if (status.includes("SUSPEND")) return { normalized: "suspended", isCurrent: false };
  if (status.includes("REVOK")) return { normalized: "revoked", isCurrent: false };
  if (status.includes("PROBATION")) return { normalized: "probation", isCurrent: false };
  if (status.includes("INACTIVE")) return { normalized: "inactive", isCurrent: false };
  if (status.includes("EXPIRED") || isPastDate(row.expirationDate)) return { normalized: "expired", isCurrent: false };
  if (status === "ACTIVE") return { normalized: "active", isCurrent: true };
  return { normalized: "unknown", isCurrent: null };
}

export function mapArizonaRocTradeCategories(row: Pick<ArizonaRocRow, "classificationCode" | "classificationLabel" | "classType">): TradeCategory[] {
  const value = [row.classificationCode, row.classificationLabel, row.classType].filter(Boolean).join(" ").toLowerCase();
  const categories = new Set<TradeCategory>();
  if (value.includes("general") || /\bb-?1?\b/.test(value)) categories.add("general_contracting");
  if (value.includes("residential")) categories.add("residential_contracting");
  if (value.includes("commercial")) categories.add("commercial_contracting");
  if (value.includes("roof")) categories.add("roofing");
  if (value.includes("air conditioning") || value.includes("refrigeration") || value.includes("hvac")) categories.add("hvac");
  if (value.includes("plumb")) categories.add("plumbing");
  if (value.includes("electric")) categories.add("electrical");
  if (value.includes("solar")) categories.add("solar");
  if (value.includes("pool")) categories.add("pool_spa");
  return categories.size ? [...categories] : ["unknown"];
}

export function buildArizonaRocWarnings(row: ArizonaRocRow): AdapterWarning[] {
  const warnings: AdapterWarning[] = [];
  if (!row.licenseNumber) warnings.push({ code: "missing_license_number", message: "Arizona ROC row is missing a license number.", recordFingerprint: row.fingerprint });
  if (mapArizonaRocTradeCategories(row).includes("unknown")) warnings.push({ code: "unknown_classification", message: `Arizona ROC classification is not categorized yet: ${row.classificationCode || "(blank)"} ${row.classificationLabel || ""}`.trim(), recordFingerprint: row.fingerprint });
  if (normalizeArizonaRocStatus(row).normalized === "unknown") warnings.push({ code: "unknown_status", message: `Arizona ROC status is not categorized yet: ${row.status || "(blank)"}.`, recordFingerprint: row.fingerprint });
  return warnings;
}

function isPastDate(value: string | null): boolean {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) < Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}
