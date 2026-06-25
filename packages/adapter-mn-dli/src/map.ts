import { buildFingerprint, normalizeLicenseNumber, normalizeText } from "@opentrade/core";

export const MN_DLI_COLUMNS = [
  "License Number",
  "License Type",
  "Name",
  "Doing Business As",
  "Address Line 1",
  "Address Line 2",
  "City",
  "State",
  "Zip",
  "County",
  "Phone",
  "Status",
  "Issue Date",
  "Expiration Date",
  "Discipline Indicator",
] as const;

export type MinnesotaDliColumn = (typeof MN_DLI_COLUMNS)[number];

export type MinnesotaDliRow = {
  licenseNumber: string;
  licenseNumberNormalized: string;
  licenseType: string | null;
  name: string | null;
  dbaName: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  county: string | null;
  phone: string | null;
  status: string | null;
  issueDate: string | null;
  expirationDate: string | null;
  disciplineIndicator: string | null;
  raw: Record<MinnesotaDliColumn, string>;
  fingerprint: string;
};

export function mapMinnesotaDliFields(fields: string[], header: string[] = [...MN_DLI_COLUMNS]): MinnesotaDliRow {
  if (fields.length < header.length) {
    throw new Error(`Unexpected Minnesota DLI record width. Expected at least ${header.length} columns, received ${fields.length}.`);
  }

  const raw = Object.fromEntries(
    MN_DLI_COLUMNS.map((columnName) => [columnName, fields[header.indexOf(columnName)] ?? ""]),
  ) as Record<MinnesotaDliColumn, string>;
  const licenseNumber = normalizeText(raw["License Number"]) ?? "";

  return {
    licenseNumber,
    licenseNumberNormalized: normalizeLicenseNumber(licenseNumber) ?? licenseNumber,
    licenseType: normalizeText(raw["License Type"]),
    name: normalizeText(raw.Name),
    dbaName: normalizeText(raw["Doing Business As"]),
    addressLine1: normalizeText(raw["Address Line 1"]),
    addressLine2: normalizeText(raw["Address Line 2"]),
    city: normalizeText(raw.City),
    state: normalizeText(raw.State),
    zipCode: normalizeText(raw.Zip),
    county: normalizeText(raw.County),
    phone: normalizeText(raw.Phone),
    status: normalizeText(raw.Status),
    issueDate: parseMinnesotaDliDate(raw["Issue Date"]),
    expirationDate: parseMinnesotaDliDate(raw["Expiration Date"]),
    disciplineIndicator: normalizeText(raw["Discipline Indicator"]),
    raw,
    fingerprint: buildFingerprint(raw),
  };
}

export function parseMinnesotaDliDate(value: string | null | undefined): string | null {
  const trimmed = normalizeText(value);
  if (!trimmed) {
    return null;
  }

  const slashMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);

  if (slashMatch) {
    const [, month, day, year] = slashMatch;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))).toISOString();
  }

  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))).toISOString();
  }

  return null;
}
