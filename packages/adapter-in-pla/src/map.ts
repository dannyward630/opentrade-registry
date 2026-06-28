import { buildFingerprint, normalizeLicenseNumber, normalizeText } from "@opentrade-registry/core";

export const IN_PLA_COLUMNS = [
  "License Number",
  "License Type",
  "License Status",
  "Name",
  "DBA Name",
  "Address Line 1",
  "Address Line 2",
  "City",
  "State",
  "Zip",
  "County",
  "Phone",
  "Issue Date",
  "Expiration Date",
  "Board",
] as const;

export type IndianaPlaColumn = (typeof IN_PLA_COLUMNS)[number];

export type IndianaPlaRow = {
  licenseNumber: string;
  licenseNumberNormalized: string;
  licenseType: string;
  licenseStatus: string;
  name: string | null;
  dbaName: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  county: string | null;
  phone: string | null;
  issueDate: string | null;
  expirationDate: string | null;
  board: string | null;
  raw: Record<IndianaPlaColumn, string>;
  fingerprint: string;
};

export function mapIndianaPlaFields(fields: string[], header: string[] = [...IN_PLA_COLUMNS]): IndianaPlaRow {
  if (fields.length !== header.length) {
    throw new Error(`Unexpected Indiana PLA record width. Expected ${header.length} columns, received ${fields.length}.`);
  }

  const raw = Object.fromEntries(
    IN_PLA_COLUMNS.map((columnName) => [columnName, fields[header.indexOf(columnName)] ?? ""]),
  ) as Record<IndianaPlaColumn, string>;
  const licenseNumber = normalizeText(raw["License Number"]) ?? "";

  return {
    licenseNumber,
    licenseNumberNormalized: normalizeLicenseNumber(licenseNumber) ?? licenseNumber,
    licenseType: normalizeText(raw["License Type"]) ?? "",
    licenseStatus: normalizeText(raw["License Status"]) ?? "",
    name: normalizeText(raw.Name),
    dbaName: normalizeText(raw["DBA Name"]),
    addressLine1: normalizeText(raw["Address Line 1"]),
    addressLine2: normalizeText(raw["Address Line 2"]),
    city: normalizeText(raw.City),
    state: normalizeText(raw.State),
    zip: normalizeText(raw.Zip),
    county: normalizeText(raw.County),
    phone: normalizeText(raw.Phone),
    issueDate: parseIndianaPlaDate(raw["Issue Date"]),
    expirationDate: parseIndianaPlaDate(raw["Expiration Date"]),
    board: normalizeText(raw.Board),
    raw,
    fingerprint: buildFingerprint(raw),
  };
}

export function parseIndianaPlaDate(value: string | null | undefined): string | null {
  const trimmed = normalizeText(value);
  if (!trimmed) {
    return null;
  }

  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (!match) {
    return null;
  }

  const [, month, day, year] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))).toISOString();
}
