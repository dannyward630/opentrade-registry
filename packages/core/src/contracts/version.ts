import {
  canonicalTradeLicenseRecordSchema,
  canonicalTradeLicenseRecordV2Schema,
  type CanonicalTradeLicenseRecord,
  type CanonicalTradeLicenseRecordV2,
} from "../schema/canonical-license.js";
import { sourceRegistryEntrySchema, sourceRegistryEntryV1Schema, type SourceRegistryEntry } from "../schema/source-registry.js";

export const OPENTRADE_V1_API_VERSION = "1.0" as const;
export const OPENTRADE_V1_CANONICAL_SCHEMA_VERSION = "1.0" as const;
export const OPENTRADE_V1_SOURCE_REGISTRY_SCHEMA_VERSION = "1.0" as const;
export const OPENTRADE_V2_API_VERSION = "2.0" as const;
export const OPENTRADE_V2_CANONICAL_SCHEMA_VERSION = "2.0" as const;
export const OPENTRADE_V2_SOURCE_REGISTRY_SCHEMA_VERSION = "2.0" as const;

// V1 remains the default until every public emitter has completed its v2 migration.
export const OPENTRADE_API_VERSION = OPENTRADE_V1_API_VERSION;
export const OPENTRADE_CANONICAL_SCHEMA_VERSION = OPENTRADE_V1_CANONICAL_SCHEMA_VERSION;
export const OPENTRADE_SOURCE_REGISTRY_SCHEMA_VERSION = OPENTRADE_V1_SOURCE_REGISTRY_SCHEMA_VERSION;

export type VersionedCanonicalTradeLicenseRecord = CanonicalTradeLicenseRecord & {
  schemaVersion: typeof OPENTRADE_CANONICAL_SCHEMA_VERSION;
};

export type SourceRegistryCompatibilityResult = {
  schemaVersion: "0.2" | typeof OPENTRADE_SOURCE_REGISTRY_SCHEMA_VERSION;
  needsV1CompletionReview: boolean;
  entry: SourceRegistryEntry;
};

export function parseCanonicalTradeLicenseRecord(value: unknown): VersionedCanonicalTradeLicenseRecord {
  const record = canonicalTradeLicenseRecordSchema.parse(value);
  return {
    ...record,
    schemaVersion: OPENTRADE_CANONICAL_SCHEMA_VERSION,
  };
}

export const parseCanonicalTradeLicenseRecordV1 = parseCanonicalTradeLicenseRecord;

export function parseCanonicalTradeLicenseRecordV2(value: unknown): CanonicalTradeLicenseRecordV2 {
  return canonicalTradeLicenseRecordV2Schema.parse(value);
}

export type CanonicalV1ToV2MigrationMetadata = Pick<
  CanonicalTradeLicenseRecordV2,
  "id" | "recordVersion" | "sourceSnapshotId" | "observedAt" | "publication" | "sensitivity"
>;

export function migrateCanonicalTradeLicenseRecordV1ToV2(
  value: unknown,
  metadata: CanonicalV1ToV2MigrationMetadata,
): CanonicalTradeLicenseRecordV2 {
  const record = parseCanonicalTradeLicenseRecordV1(value);
  const { schemaVersion: _schemaVersion, ...v1Fields } = record;
  return parseCanonicalTradeLicenseRecordV2({
    ...v1Fields,
    ...metadata,
    schemaVersion: OPENTRADE_V2_CANONICAL_SCHEMA_VERSION,
  });
}

export function parseSourceRegistryEntry(value: unknown): SourceRegistryCompatibilityResult {
  const schemaVersion = getSchemaVersion(value);
  const entry = schemaVersion === OPENTRADE_SOURCE_REGISTRY_SCHEMA_VERSION
    ? sourceRegistryEntryV1Schema.parse(value)
    : sourceRegistryEntrySchema.parse(value);
  return {
    schemaVersion,
    needsV1CompletionReview: schemaVersion !== OPENTRADE_SOURCE_REGISTRY_SCHEMA_VERSION,
    entry,
  };
}

function getSchemaVersion(value: unknown): "0.2" | typeof OPENTRADE_SOURCE_REGISTRY_SCHEMA_VERSION {
  if (value && typeof value === "object" && (value as { schemaVersion?: unknown }).schemaVersion === OPENTRADE_SOURCE_REGISTRY_SCHEMA_VERSION) {
    return OPENTRADE_SOURCE_REGISTRY_SCHEMA_VERSION;
  }
  return "0.2";
}
