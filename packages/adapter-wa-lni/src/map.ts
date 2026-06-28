import { buildFingerprint, normalizeLicenseNumber, normalizeText } from "@opentrade-registry/core";

export const WA_LNI_COLUMNS = [
  "BusinessName",
  "ContractorLicenseNumber",
  "ContractorLicenseTypeCode",
  "ContractorLicenseTypeCodeDesc",
  "Address1",
  "Address2",
  "City",
  "State",
  "Zip",
  "PhoneNumber",
  "LicenseEffectiveDate",
  "LicenseExpirationDate",
  "BusinessTypeCode",
  "BusinessTypeCodeDesc",
  "SpecialtyCode1",
  "SpecialtyCode1Desc",
  "SpecialtyCode2",
  "SpecialtyCode2Desc",
  "UBI",
  "PrimaryPrincipalName",
  "StatusCode",
  "ContractorLicenseStatus",
  "ContractorLicenseSuspendDate",
] as const;

export type WashingtonLniColumn = (typeof WA_LNI_COLUMNS)[number];

export type WashingtonLniRow = {
  businessName: string | null;
  licenseNumber: string;
  licenseNumberNormalized: string;
  licenseTypeCode: string | null;
  licenseTypeLabel: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phoneNumber: string | null;
  effectiveDate: string | null;
  expirationDate: string | null;
  businessTypeCode: string | null;
  businessTypeLabel: string | null;
  specialtyCode1: string | null;
  specialtyLabel1: string | null;
  specialtyCode2: string | null;
  specialtyLabel2: string | null;
  ubi: string | null;
  primaryPrincipalName: string | null;
  statusCode: string | null;
  statusLabel: string | null;
  suspendDate: string | null;
  raw: Record<WashingtonLniColumn, string>;
  fingerprint: string;
};

export function mapWashingtonLniFields(fields: string[], header: string[] = [...WA_LNI_COLUMNS]): WashingtonLniRow {
  if (fields.length < header.length) {
    throw new Error(`Unexpected Washington L&I record width. Expected at least ${header.length} columns, received ${fields.length}.`);
  }

  const raw = Object.fromEntries(
    WA_LNI_COLUMNS.map((columnName) => [columnName, fields[header.indexOf(columnName)] ?? ""]),
  ) as Record<WashingtonLniColumn, string>;
  const licenseNumber = normalizeText(raw.ContractorLicenseNumber) ?? "";

  return {
    businessName: normalizeText(raw.BusinessName),
    licenseNumber,
    licenseNumberNormalized: normalizeLicenseNumber(licenseNumber) ?? licenseNumber,
    licenseTypeCode: normalizeText(raw.ContractorLicenseTypeCode),
    licenseTypeLabel: normalizeText(raw.ContractorLicenseTypeCodeDesc),
    address1: normalizeText(raw.Address1),
    address2: normalizeText(raw.Address2),
    city: normalizeText(raw.City),
    state: normalizeText(raw.State),
    zip: normalizeText(raw.Zip),
    phoneNumber: normalizeText(raw.PhoneNumber),
    effectiveDate: parseWashingtonDate(raw.LicenseEffectiveDate),
    expirationDate: parseWashingtonDate(raw.LicenseExpirationDate),
    businessTypeCode: normalizeText(raw.BusinessTypeCode),
    businessTypeLabel: normalizeText(raw.BusinessTypeCodeDesc),
    specialtyCode1: normalizeText(raw.SpecialtyCode1),
    specialtyLabel1: normalizeText(raw.SpecialtyCode1Desc),
    specialtyCode2: normalizeText(raw.SpecialtyCode2),
    specialtyLabel2: normalizeText(raw.SpecialtyCode2Desc),
    ubi: normalizeText(raw.UBI),
    primaryPrincipalName: normalizeText(raw.PrimaryPrincipalName),
    statusCode: normalizeText(raw.StatusCode),
    statusLabel: normalizeText(raw.ContractorLicenseStatus),
    suspendDate: parseWashingtonDate(raw.ContractorLicenseSuspendDate),
    raw,
    fingerprint: buildFingerprint(raw),
  };
}

export function parseWashingtonDate(value: string | null | undefined): string | null {
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
