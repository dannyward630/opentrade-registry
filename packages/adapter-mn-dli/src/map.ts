import { buildFingerprint, normalizeLicenseNumber, normalizeText } from "@opentrade-registry/core";

export const MN_DLI_COLUMNS = [
  "Bus_Pers",
  "License_Type",
  "License_Subtype",
  "Name",
  "DBA_Name",
  "Addr1",
  "Addr2",
  "City",
  "St",
  "Zip",
  "Phone_No",
  "Email_Address",
  "Lic_Number",
  "Status",
  "Orig_Date",
  "Exp_Date",
  "Enforcement_Action",
  "Renewal_in_Progress",
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
  const licenseNumber = normalizeText(raw.Lic_Number) ?? "";

  return {
    licenseNumber,
    licenseNumberNormalized: normalizeLicenseNumber(licenseNumber) ?? licenseNumber,
    licenseType: normalizeText(raw.License_Subtype) ?? normalizeText(raw.License_Type),
    name: normalizeText(raw.Name),
    dbaName: normalizeText(raw.DBA_Name),
    addressLine1: normalizeText(raw.Addr1),
    addressLine2: normalizeText(raw.Addr2),
    city: normalizeText(raw.City),
    state: normalizeText(raw.St),
    zipCode: normalizeText(raw.Zip),
    county: null,
    phone: normalizeText(raw.Phone_No),
    status: normalizeText(raw.Status),
    issueDate: parseMinnesotaDliDate(raw.Orig_Date),
    expirationDate: parseMinnesotaDliDate(raw.Exp_Date),
    disciplineIndicator: normalizeEnforcementAction(raw.Enforcement_Action),
    raw,
    fingerprint: buildFingerprint(raw),
  };
}

function normalizeEnforcementAction(value: string | null | undefined): string | null {
  const normalized = normalizeText(value);
  return normalized === "0" ? null : normalized;
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
