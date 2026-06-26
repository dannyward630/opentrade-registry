import { buildFingerprint, normalizeLicenseNumber, normalizeText } from "@opentrade/core";

export const AK_COMMERCE_COLUMNS = [
  "LicenseNumber",
  "LicenseType",
  "Program",
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
  "Endorsement",
  "Classification",
  "Discipline",
  "Board",
] as const;

export type AlaskaCommerceColumn = (typeof AK_COMMERCE_COLUMNS)[number];

export type AlaskaCommerceRow = {
  licenseNumber: string;
  licenseNumberNormalized: string;
  licenseType: string;
  program: string | null;
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
  endorsement: string | null;
  classification: string | null;
  discipline: string | null;
  board: string | null;
  raw: Record<AlaskaCommerceColumn, string>;
  fingerprint: string;
};

export function mapAlaskaCommerceFields(fields: string[], header: string[] = [...AK_COMMERCE_COLUMNS]): AlaskaCommerceRow {
  if (fields.length !== header.length) {
    throw new Error(`Unexpected Alaska CBPL record width. Expected ${header.length} columns, received ${fields.length}.`);
  }

  const raw = Object.fromEntries(
    AK_COMMERCE_COLUMNS.map((columnName) => [columnName, fields[header.indexOf(columnName)] ?? ""]),
  ) as Record<AlaskaCommerceColumn, string>;
  const licenseNumber = normalizeText(raw.LicenseNumber) ?? "";

  return {
    licenseNumber,
    licenseNumberNormalized: normalizeLicenseNumber(licenseNumber) ?? licenseNumber,
    licenseType: normalizeText(raw.LicenseType) ?? "",
    program: normalizeText(raw.Program),
    status: normalizeText(raw.Status) ?? "",
    issueDate: parseAlaskaCommerceDate(raw.IssueDate),
    expirationDate: parseAlaskaCommerceDate(raw.ExpirationDate),
    businessName: normalizeText(raw.BusinessName),
    dbaName: normalizeText(raw.DBAName),
    licenseeName: normalizeText(raw.LicenseeName),
    addressLine1: normalizeText(raw.AddressLine1),
    addressLine2: normalizeText(raw.AddressLine2),
    city: normalizeText(raw.City),
    state: normalizeText(raw.State)?.toUpperCase() ?? null,
    zip: normalizeText(raw.Zip),
    phone: normalizeText(raw.Phone),
    endorsement: normalizeText(raw.Endorsement),
    classification: normalizeText(raw.Classification),
    discipline: normalizeText(raw.Discipline),
    board: normalizeText(raw.Board),
    raw,
    fingerprint: buildFingerprint(raw),
  };
}

export function parseAlaskaCommerceDate(value: string | null | undefined): string | null {
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
