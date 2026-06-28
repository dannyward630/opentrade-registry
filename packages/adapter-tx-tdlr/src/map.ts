import { buildFingerprint, normalizeLicenseNumber, normalizeText } from "@opentrade-registry/core";

export const TDLR_COLUMNS = [
  "LICENSE TYPE",
  "LICENSE NUMBER",
  "BUSINESS COUNTY",
  "BUSINESS NAME",
  "BUSINESS ADDRESS-LINE1",
  "BUSINESS ADDRESS-LINE2",
  "BUSINESS CITY, STATE ZIP",
  "BUSINESS TELEPHONE",
  "LICENSE EXPIRATION DATE (MMDDCCYY)",
  "OWNER NAME",
  "MAILING ADDRESS LINE1",
  "MAILING ADDRESS LINE2",
  "MAILING ADDRESS CITY, STATE ZIP",
  "MAILING ADDRESS COUNTY",
  "OWNER TELEPHONE",
  "LICENSE SUBTYPE",
  "CONTINUING EDUCATION FLAG",
] as const;

export type TexasTdlrColumn = (typeof TDLR_COLUMNS)[number];

export type TexasTdlrRow = {
  licenseType: string;
  licenseNumber: string;
  licenseNumberNormalized: string;
  businessCounty: string | null;
  businessName: string | null;
  businessAddressLine1: string | null;
  businessAddressLine2: string | null;
  businessCityStateZip: string | null;
  businessTelephone: string | null;
  expirationDate: string | null;
  ownerName: string | null;
  mailingAddressLine1: string | null;
  mailingAddressLine2: string | null;
  mailingAddressCityStateZip: string | null;
  mailingAddressCounty: string | null;
  ownerTelephone: string | null;
  licenseSubtype: string | null;
  continuingEducationFlag: string | null;
  raw: Record<TexasTdlrColumn, string>;
  fingerprint: string;
};

export function mapTexasTdlrFields(fields: string[], header: string[] = [...TDLR_COLUMNS]): TexasTdlrRow {
  if (fields.length !== header.length) {
    throw new Error(`Unexpected Texas TDLR record width. Expected ${header.length} columns, received ${fields.length}.`);
  }

  const raw = Object.fromEntries(
    TDLR_COLUMNS.map((columnName) => [columnName, fields[header.indexOf(columnName)] ?? ""]),
  ) as Record<TexasTdlrColumn, string>;
  const licenseNumber = normalizeText(raw["LICENSE NUMBER"]) ?? "";

  return {
    licenseType: normalizeText(raw["LICENSE TYPE"]) ?? "",
    licenseNumber,
    licenseNumberNormalized: normalizeLicenseNumber(licenseNumber) ?? licenseNumber,
    businessCounty: normalizeText(raw["BUSINESS COUNTY"]),
    businessName: normalizeText(raw["BUSINESS NAME"]),
    businessAddressLine1: normalizeText(raw["BUSINESS ADDRESS-LINE1"]),
    businessAddressLine2: normalizeText(raw["BUSINESS ADDRESS-LINE2"]),
    businessCityStateZip: normalizeText(raw["BUSINESS CITY, STATE ZIP"]),
    businessTelephone: normalizeText(raw["BUSINESS TELEPHONE"]),
    expirationDate: parseTdlrDate(raw["LICENSE EXPIRATION DATE (MMDDCCYY)"]),
    ownerName: normalizeText(raw["OWNER NAME"]),
    mailingAddressLine1: normalizeText(raw["MAILING ADDRESS LINE1"]),
    mailingAddressLine2: normalizeText(raw["MAILING ADDRESS LINE2"]),
    mailingAddressCityStateZip: normalizeText(raw["MAILING ADDRESS CITY, STATE ZIP"]),
    mailingAddressCounty: normalizeText(raw["MAILING ADDRESS COUNTY"]),
    ownerTelephone: normalizeText(raw["OWNER TELEPHONE"]),
    licenseSubtype: normalizeText(raw["LICENSE SUBTYPE"]),
    continuingEducationFlag: normalizeText(raw["CONTINUING EDUCATION FLAG"]),
    raw,
    fingerprint: buildFingerprint(raw),
  };
}

function parseTdlrDate(value: string | null | undefined): string | null {
  const trimmed = normalizeText(value);
  if (!trimmed) {
    return null;
  }

  const compactMatch = /^(\d{2})(\d{2})(\d{4})$/.exec(trimmed);
  const slashMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  const match = compactMatch ?? slashMatch;
  if (!match) {
    return null;
  }

  const [, month, day, year] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))).toISOString();
}
