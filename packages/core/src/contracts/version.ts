import { canonicalTradeLicenseRecordSchema, type CanonicalTradeLicenseRecord } from "../schema/canonical-license.js";
import { sourceRegistryEntrySchema, type SourceRegistryEntry } from "../schema/source-registry.js";

export const OPENTRADE_API_VERSION = "1.0" as const;
export const OPENTRADE_CANONICAL_SCHEMA_VERSION = "1.0" as const;
export const OPENTRADE_SOURCE_REGISTRY_SCHEMA_VERSION = "1.0" as const;

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

export function parseSourceRegistryEntry(value: unknown): SourceRegistryCompatibilityResult {
  const entry = sourceRegistryEntrySchema.parse(value);
  const schemaVersion = getSchemaVersion(value);
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
