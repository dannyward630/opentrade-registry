import { buildFingerprint, normalizeLicenseNumber, normalizeText } from "@opentrade/core";

export const CA_CSLB_COLUMNS = [
  "LicenseNo",
  "LastUpdate",
  "BusinessName",
  "BUS-NAME-2",
  "FullBusinessName",
  "MailingAddress",
  "City",
  "State",
  "County",
  "ZIPCode",
  "country",
  "BusinessPhone",
  "BusinessType",
  "IssueDate",
  "ReissueDate",
  "ExpirationDate",
  "InactivationDate",
  "ReactivationDate",
  "PendingSuspension",
  "PendingClassRemoval",
  "PendingClassReplace",
  "PrimaryStatus",
  "SecondaryStatus",
  "Classifications(s)",
  "AsbestosReg",
  "WorkersCompCoverageType",
  "WCInsuranceCompany",
  "WCPolicyNumber",
  "WCEffectiveDate",
  "WCExpirationDate",
  "WCCancellationDate",
  "WCSuspendDate",
  "CBSuretyCompany",
  "CBNumber",
  "CBEffectiveDate",
  "CBCancellationDate",
  "CBAmount",
  "WBSuretyCompany",
  "WBNumber",
  "WBEffectiveDate",
  "WBCancellationDate",
  "WBAmount",
  "DBSuretyCompany",
  "DBNumber",
  "DBEffectiveDate",
  "DBCancellationDate",
  "DBAmount",
  "DateRequired",
  "DiscpCaseRegion",
  "DBBondReason",
  "DBCaseNo",
  "NAME-TP-2",
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
  const licenseNumber = normalizeText(raw.LicenseNo) ?? "";
  const statuses = [normalizeText(raw.PrimaryStatus), normalizeText(raw.SecondaryStatus)].filter((value): value is string => Boolean(value));

  return {
    licenseNumber,
    licenseNumberNormalized: normalizeLicenseNumber(licenseNumber) ?? licenseNumber,
    businessName: normalizeText(raw.BusinessName) ?? normalizeText(raw.FullBusinessName),
    dbaName: normalizeText(raw["BUS-NAME-2"]),
    licenseType: normalizeText(raw.BusinessType),
    classifications: splitClassifications(raw["Classifications(s)"]),
    status: statuses.join("; ") || null,
    issueDate: parseCaliforniaCslbDate(raw.IssueDate),
    expirationDate: parseCaliforniaCslbDate(raw.ExpirationDate),
    address: normalizeText(raw.MailingAddress),
    city: normalizeText(raw.City),
    state: normalizeText(raw.State),
    zipCode: normalizeText(raw.ZIPCode),
    county: normalizeText(raw.County),
    phone: normalizeText(raw.BusinessPhone),
    personnelName: null,
    personnelTitle: null,
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
    .split(/[;,]/)
    .map((classification) => classification.trim())
    .filter(Boolean);
}
