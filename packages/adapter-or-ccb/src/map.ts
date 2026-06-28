import { buildFingerprint, normalizeLicenseNumber, normalizeText } from "@opentrade-registry/core";

export const OR_CCB_COLUMNS = [
  "license_number",
  "license_type",
  "related_key",
  "related_type",
  "county_code",
  "county_name",
  "lic_exp_date",
  "orig_regis_date",
  "bond_company",
  "bond_amount",
  "bond_exp_date",
  "ins_company",
  "ins_amount",
  "ins_exp_date",
  "full_name",
  "address",
  "city",
  "state",
  "zip_code",
  "phone_number",
  "fax_number",
  "rmi_name",
  "exempt_text",
  "endorsement_text",
] as const;

export type OregonCcbColumn = (typeof OR_CCB_COLUMNS)[number];

export type OregonCcbRow = {
  licenseNumber: string;
  licenseNumberNormalized: string;
  licenseType: string | null;
  relatedKey: string | null;
  relatedType: string | null;
  countyCode: string | null;
  countyName: string | null;
  expirationDate: string | null;
  originalRegistrationDate: string | null;
  bondCompany: string | null;
  bondAmount: string | null;
  bondExpirationDate: string | null;
  insuranceCompany: string | null;
  insuranceAmount: string | null;
  insuranceExpirationDate: string | null;
  fullName: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  phoneNumber: string | null;
  faxNumber: string | null;
  rmiName: string | null;
  exemptText: string | null;
  endorsementText: string | null;
  raw: Record<OregonCcbColumn, string>;
  fingerprint: string;
};

export function mapOregonCcbFields(fields: string[], header: string[] = [...OR_CCB_COLUMNS]): OregonCcbRow {
  if (fields.length < header.length) {
    throw new Error(`Unexpected Oregon CCB record width. Expected at least ${header.length} columns, received ${fields.length}.`);
  }

  const raw = Object.fromEntries(
    OR_CCB_COLUMNS.map((columnName) => [columnName, fields[header.indexOf(columnName)] ?? ""]),
  ) as Record<OregonCcbColumn, string>;
  const licenseNumber = normalizeText(raw.license_number) ?? "";

  return {
    licenseNumber,
    licenseNumberNormalized: normalizeLicenseNumber(licenseNumber) ?? licenseNumber,
    licenseType: normalizeText(raw.license_type),
    relatedKey: normalizeText(raw.related_key),
    relatedType: normalizeText(raw.related_type),
    countyCode: normalizeText(raw.county_code),
    countyName: normalizeText(raw.county_name),
    expirationDate: parseOregonDate(raw.lic_exp_date),
    originalRegistrationDate: parseOregonDate(raw.orig_regis_date),
    bondCompany: normalizeText(raw.bond_company),
    bondAmount: normalizeText(raw.bond_amount),
    bondExpirationDate: parseOregonDate(raw.bond_exp_date),
    insuranceCompany: normalizeText(raw.ins_company),
    insuranceAmount: normalizeText(raw.ins_amount),
    insuranceExpirationDate: parseOregonDate(raw.ins_exp_date),
    fullName: normalizeText(raw.full_name),
    address: normalizeText(raw.address),
    city: normalizeText(raw.city),
    state: normalizeText(raw.state),
    zipCode: normalizeText(raw.zip_code),
    phoneNumber: normalizeText(raw.phone_number),
    faxNumber: normalizeText(raw.fax_number),
    rmiName: normalizeText(raw.rmi_name),
    exemptText: normalizeText(raw.exempt_text),
    endorsementText: normalizeText(raw.endorsement_text),
    raw,
    fingerprint: buildFingerprint(raw),
  };
}

export function parseOregonDate(value: string | null | undefined): string | null {
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
