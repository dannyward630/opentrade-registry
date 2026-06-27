import { buildFingerprint, normalizeLicenseNumber, normalizeText } from "@opentrade/core";

export const AZ_ROC_COLUMNS = [
  "License No", "Business Name", "Doing Business As", "Class", "Class Detail", "Class Type",
  "Address", "City", "State", "Zip", "Qualifying Party", "Issued Date", "Expiration Date", "Status",
] as const;

export type ArizonaRocColumn = (typeof AZ_ROC_COLUMNS)[number];

export type ArizonaRocRow = {
  licenseNumber: string;
  licenseNumberNormalized: string;
  businessName: string | null;
  dbaName: string | null;
  classificationCode: string | null;
  classificationLabel: string | null;
  classType: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  qualifyingParty: string | null;
  issueDate: string | null;
  expirationDate: string | null;
  status: string | null;
  raw: Record<ArizonaRocColumn, string>;
  fingerprint: string;
};

export function mapArizonaRocFields(fields: string[], header: string[] = [...AZ_ROC_COLUMNS]): ArizonaRocRow {
  if (fields.length < header.length) {
    throw new Error(`Unexpected Arizona ROC record width. Expected at least ${header.length} columns, received ${fields.length}.`);
  }
  const raw = Object.fromEntries(AZ_ROC_COLUMNS.map((column) => [column, fields[header.indexOf(column)] ?? ""])) as Record<ArizonaRocColumn, string>;
  const licenseNumber = normalizeText(raw["License No"]) ?? "";
  return {
    licenseNumber,
    licenseNumberNormalized: normalizeLicenseNumber(licenseNumber) ?? licenseNumber,
    businessName: normalizeText(raw["Business Name"]),
    dbaName: normalizeText(raw["Doing Business As"]),
    classificationCode: normalizeText(raw.Class),
    classificationLabel: normalizeText(raw["Class Detail"]),
    classType: normalizeText(raw["Class Type"]),
    address: normalizeText(raw.Address),
    city: normalizeText(raw.City),
    state: normalizeText(raw.State),
    zip: normalizeText(raw.Zip),
    qualifyingParty: normalizeText(raw["Qualifying Party"]),
    issueDate: parseArizonaRocDate(raw["Issued Date"]),
    expirationDate: parseArizonaRocDate(raw["Expiration Date"]),
    status: normalizeText(raw.Status),
    raw,
    fingerprint: buildFingerprint(raw),
  };
}

export function parseArizonaRocDate(value: string | null | undefined): string | null {
  const text = normalizeText(value);
  if (!text) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  const parts = iso ? [iso[1], iso[2], iso[3]] : slash ? [slash[3], slash[1], slash[2]] : null;
  if (!parts) return null;
  const [year, month, day] = parts;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))).toISOString();
}
