import { buildFingerprint, normalizeLicenseNumber, normalizeText } from "@opentrade-registry/core";

export const IL_IDFPR_COLUMNS = [
  "LicenseNumber",
  "ProfessionName",
  "LicenseType",
  "Status",
  "IssueDate",
  "ExpirationDate",
  "BusinessName",
  "DBAName",
  "LicenseeName",
  "AddressLine1",
  "AddressLine2",
  "City",
  "State",
  "Zip",
  "Phone",
  "County",
  "Discipline",
  "Board",
] as const;

export type IllinoisIdfprColumn = (typeof IL_IDFPR_COLUMNS)[number];

export type IllinoisIdfprRow = {
  licenseNumber: string;
  licenseNumberNormalized: string;
  professionName: string;
  licenseType: string;
  status: string;
  issueDate: string | null;
  expirationDate: string | null;
  businessName: string | null;
  dbaName: string | null;
  licenseeName: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  county: string | null;
  discipline: string | null;
  board: string | null;
  raw: Record<IllinoisIdfprColumn, string>;
  fingerprint: string;
};

export function mapIllinoisIdfprFields(fields: string[], header: string[] = [...IL_IDFPR_COLUMNS]): IllinoisIdfprRow {
  if (fields.length !== header.length) {
    throw new Error(`Unexpected Illinois IDFPR record width. Expected ${header.length} columns, received ${fields.length}.`);
  }

  const raw = Object.fromEntries(
    IL_IDFPR_COLUMNS.map((columnName) => [columnName, fields[header.indexOf(columnName)] ?? ""]),
  ) as Record<IllinoisIdfprColumn, string>;
  const licenseNumber = normalizeText(raw.LicenseNumber) ?? "";

  return {
    licenseNumber,
    licenseNumberNormalized: normalizeLicenseNumber(licenseNumber) ?? licenseNumber,
    professionName: normalizeText(raw.ProfessionName) ?? "",
    licenseType: normalizeText(raw.LicenseType) ?? "",
    status: normalizeText(raw.Status) ?? "",
    issueDate: parseIllinoisIdfprDate(raw.IssueDate),
    expirationDate: parseIllinoisIdfprDate(raw.ExpirationDate),
    businessName: normalizeText(raw.BusinessName),
    dbaName: normalizeText(raw.DBAName),
    licenseeName: normalizeText(raw.LicenseeName),
    addressLine1: normalizeText(raw.AddressLine1),
    addressLine2: normalizeText(raw.AddressLine2),
    city: normalizeText(raw.City),
    state: normalizeText(raw.State)?.toUpperCase() ?? null,
    zip: normalizeText(raw.Zip),
    phone: normalizeText(raw.Phone),
    county: normalizeText(raw.County),
    discipline: normalizeText(raw.Discipline),
    board: normalizeText(raw.Board),
    raw,
    fingerprint: buildFingerprint(raw),
  };
}

export function parseIllinoisIdfprDate(value: string | null | undefined): string | null {
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
