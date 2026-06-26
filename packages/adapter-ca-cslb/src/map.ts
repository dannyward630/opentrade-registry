import { buildFingerprint, normalizeLicenseNumber, normalizeText } from "@opentrade/core";

export const CA_CSLB_COLUMNS = [
  "License Number",
  "Business Name",
  "DBA Name",
  "License Type",
  "Classifications",
  "Status",
  "Issue Date",
  "Expiration Date",
  "Address",
  "City",
  "State",
  "Zip",
  "County",
  "Phone",
  "Personnel Name",
  "Personnel Title",
] as const;

export type CaliforniaCslbColumn = (typeof CA_CSLB_COLUMNS)[number];

export type CaliforniaCslbRow = {
  licenseNumber: string;
  licenseNumberNormalized: string;
  businessName: string | null;
  dbaName: string | null;
  licenseType: string | null;
  classifications: string[];
  status: string | null;
  issueDate: string | null;
  expirationDate: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  county: string | null;
  phone: string | null;
  personnelName: string | null;
  personnelTitle: string | null;
  raw: Record<CaliforniaCslbColumn, string>;
  fingerprint: string;
};

export function mapCaliforniaCslbFields(fields: string[], header: string[] = [...CA_CSLB_COLUMNS]): CaliforniaCslbRow {
  if (fields.length < header.length) {
    throw new Error(`Unexpected California CSLB record width. Expected at least ${header.length} columns, received ${fields.length}.`);
  }

  const raw = Object.fromEntries(
    CA_CSLB_COLUMNS.map((columnName) => [columnName, fields[header.indexOf(columnName)] ?? ""]),
  ) as Record<CaliforniaCslbColumn, string>;
  const licenseNumber = normalizeText(raw["License Number"]) ?? "";

  return {
    licenseNumber,
    licenseNumberNormalized: normalizeLicenseNumber(licenseNumber) ?? licenseNumber,
    businessName: normalizeText(raw["Business Name"]),
    dbaName: normalizeText(raw["DBA Name"]),
    licenseType: normalizeText(raw["License Type"]),
    classifications: splitClassifications(raw.Classifications),
    status: normalizeText(raw.Status),
    issueDate: parseCaliforniaCslbDate(raw["Issue Date"]),
    expirationDate: parseCaliforniaCslbDate(raw["Expiration Date"]),
    address: normalizeText(raw.Address),
    city: normalizeText(raw.City),
    state: normalizeText(raw.State),
    zipCode: normalizeText(raw.Zip),
    county: normalizeText(raw.County),
    phone: normalizeText(raw.Phone),
    personnelName: normalizeText(raw["Personnel Name"]),
    personnelTitle: normalizeText(raw["Personnel Title"]),
    raw,
    fingerprint: buildFingerprint(raw),
  };
}

export function parseCaliforniaCslbDate(value: string | null | undefined): string | null {
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

function splitClassifications(value: string | null | undefined): string[] {
  const normalized = normalizeText(value);
  if (!normalized) {
    return [];
  }

  return normalized
    .split(";")
    .map((classification) => classification.trim())
    .filter(Boolean);
}

