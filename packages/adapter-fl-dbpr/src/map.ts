import { buildFingerprint, normalizeLicenseDigits, normalizeLicenseNumber, normalizeText } from "@opentrade/core";
import { CLASS_LABELS, OCCUPATION_LABELS, PRIMARY_STATUS_LABELS, SECONDARY_STATUS_LABELS } from "./constants.js";

type DbprCsvColumn =
  | "boardNumber"
  | "occupationCode"
  | "licenseeName"
  | "doingBusinessAsName"
  | "classCode"
  | "addressLine1"
  | "addressLine2"
  | "addressLine3"
  | "city"
  | "state"
  | "zipCode"
  | "countyCode"
  | "licenseNumber"
  | "primaryStatusCode"
  | "secondaryStatusCode"
  | "originalLicensureDate"
  | "effectiveDate"
  | "expirationDate"
  | "unusedReserved"
  | "renewalPeriod"
  | "alternateLicenseNumber"
  | "unusedTrailing";

const CONSTRUCTION_COLUMNS: DbprCsvColumn[] = [
  "boardNumber",
  "occupationCode",
  "licenseeName",
  "doingBusinessAsName",
  "classCode",
  "addressLine1",
  "addressLine2",
  "addressLine3",
  "city",
  "state",
  "zipCode",
  "countyCode",
  "licenseNumber",
  "primaryStatusCode",
  "secondaryStatusCode",
  "originalLicensureDate",
  "effectiveDate",
  "expirationDate",
  "unusedReserved",
  "renewalPeriod",
  "alternateLicenseNumber",
  "unusedTrailing",
];

export type DbprConstructionRow = {
  boardNumber: string;
  occupationCode: string;
  occupationDescription: string | null;
  licenseeName: string;
  doingBusinessAsName: string | null;
  classCode: string | null;
  classCodeDescription: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  addressLine3: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  countyCode: string | null;
  licenseNumber: string;
  licenseNumberNormalized: string;
  alternateLicenseNumber: string;
  alternateLicenseNumberNormalized: string;
  primaryStatusCode: string | null;
  primaryStatusLabel: string | null;
  secondaryStatusCode: string | null;
  secondaryStatusLabel: string | null;
  originalLicensureDate: string | null;
  effectiveDate: string | null;
  expirationDate: string | null;
  renewalPeriod: string | null;
  raw: Record<DbprCsvColumn, string>;
  fingerprint: string;
};

export function mapConstructionCsvFields(inputFields: string[]): DbprConstructionRow {
  const fields = [...inputFields];
  if (fields.length === 21) {
    fields.push("");
  }

  if (fields.length !== CONSTRUCTION_COLUMNS.length) {
    throw new Error(`Unexpected Florida DBPR construction record width. Expected ${CONSTRUCTION_COLUMNS.length} columns, received ${fields.length}.`);
  }

  const raw = Object.fromEntries(CONSTRUCTION_COLUMNS.map((columnName, index) => [columnName, fields[index] ?? ""])) as Record<
    DbprCsvColumn,
    string
  >;
  const occupationCode = normalizeText(raw.occupationCode)?.toUpperCase() ?? "";
  const classCode = normalizeText(raw.classCode)?.toUpperCase() ?? null;
  const licenseNumber = normalizeText(raw.licenseNumber) ?? "";
  const alternateLicenseNumber = normalizeLicenseNumber(raw.alternateLicenseNumber) ?? normalizeLicenseNumber(licenseNumber) ?? licenseNumber;
  const primaryStatusCode = normalizeText(raw.primaryStatusCode)?.toUpperCase() ?? null;
  const secondaryStatusCode = normalizeText(raw.secondaryStatusCode)?.toUpperCase() ?? null;

  return {
    boardNumber: normalizeText(raw.boardNumber) ?? "",
    occupationCode,
    occupationDescription: OCCUPATION_LABELS[occupationCode] ?? null,
    licenseeName: normalizeText(raw.licenseeName) ?? "",
    doingBusinessAsName: normalizeText(raw.doingBusinessAsName),
    classCode,
    classCodeDescription: classCode ? CLASS_LABELS[`${occupationCode}:${classCode}`] ?? null : null,
    addressLine1: normalizeText(raw.addressLine1),
    addressLine2: normalizeText(raw.addressLine2),
    addressLine3: normalizeText(raw.addressLine3),
    city: normalizeText(raw.city),
    state: normalizeText(raw.state)?.toUpperCase() ?? null,
    zipCode: normalizeText(raw.zipCode),
    countyCode: normalizeText(raw.countyCode),
    licenseNumber,
    licenseNumberNormalized: normalizeLicenseDigits(licenseNumber) ?? normalizeLicenseNumber(licenseNumber) ?? licenseNumber,
    alternateLicenseNumber,
    alternateLicenseNumberNormalized: normalizeLicenseNumber(alternateLicenseNumber) ?? alternateLicenseNumber,
    primaryStatusCode,
    primaryStatusLabel: primaryStatusCode ? PRIMARY_STATUS_LABELS[primaryStatusCode] ?? null : null,
    secondaryStatusCode,
    secondaryStatusLabel: secondaryStatusCode ? SECONDARY_STATUS_LABELS[secondaryStatusCode] ?? null : null,
    originalLicensureDate: parseDbprDate(raw.originalLicensureDate),
    effectiveDate: parseDbprDate(raw.effectiveDate),
    expirationDate: parseDbprDate(raw.expirationDate),
    renewalPeriod: normalizeText(raw.renewalPeriod),
    raw,
    fingerprint: buildFingerprint(raw),
  };
}

function parseDbprDate(value: string | null | undefined): string | null {
  const trimmed = normalizeText(value);
  if (!trimmed) {
    return null;
  }

  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  if (!match) {
    return null;
  }

  const [, month, day, year] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))).toISOString();
}

