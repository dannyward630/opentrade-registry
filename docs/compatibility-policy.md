# Compatibility Policy

OpenTrade Registry follows semantic versioning for public packages beginning with v1.0.0.

## Versioned Contracts

The v1 contract includes:

- canonical record schema;
- source registry schema;
- adapter interface;
- verification result shape;
- CLI commands, flags, exit codes, and JSON output;
- public package exports.

`@opentrade-registry/core` exports default version identifiers plus named v1 and v2 identifiers. During the v2 migration, `OPENTRADE_API_VERSION`, `OPENTRADE_CANONICAL_SCHEMA_VERSION`, and `OPENTRADE_SOURCE_REGISTRY_SCHEMA_VERSION` remain v1 until all default emitters migrate together. Consumers can opt into the explicit `OPENTRADE_V2_*` constants and v2 schemas without guessing from package version numbers.

V2 adds required provenance, snapshot, publication, sensitivity, source operating-policy, discovery, and verification metadata. V1 records and source entries remain readable through named compatibility functions. Supplying review metadata is required when migrating into v2; the library does not invent a publication or privacy decision.

## Compatible Changes

Patch and minor releases may add optional fields, additive enum values where callers are expected to handle unknown values, adapters, source entries, helpers, commands, and non-breaking flags. Bug fixes may make malformed input fail earlier.

## Breaking Changes

Removing or renaming fields, changing required field meaning, changing CLI exit semantics, removing exports, or changing normalized behavior in a way that invalidates stored records requires a major release and migration guidance.

Source-driven mapping corrections are documented in the changelog. Raw records and fingerprints remain available so users can audit remapping.

## Legacy Readers

The v1 compatibility helpers can read the documented v0.2 source and canonical record shapes. Compatibility does not guarantee that every obsolete agency field remains meaningful; records are still validated against current canonical semantics.

V2 migration helpers validate v1 input and require the caller to provide the new policy and provenance fields. See [Migrating From v1 To v2](migration-v1-to-v2.md).

## Deprecation

Public APIs should be marked deprecated for at least one minor release before removal when practical. Security or legal issues can require immediate removal; those changes receive an advisory and changelog entry.
