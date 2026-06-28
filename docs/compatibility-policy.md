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

`@opentrade-registry/core` exports `OPENTRADE_API_VERSION`, `OPENTRADE_CANONICAL_SCHEMA_VERSION`, and `OPENTRADE_SOURCE_REGISTRY_SCHEMA_VERSION`.

## Compatible Changes

Patch and minor releases may add optional fields, additive enum values where callers are expected to handle unknown values, adapters, source entries, helpers, commands, and non-breaking flags. Bug fixes may make malformed input fail earlier.

## Breaking Changes

Removing or renaming fields, changing required field meaning, changing CLI exit semantics, removing exports, or changing normalized behavior in a way that invalidates stored records requires a major release and migration guidance.

Source-driven mapping corrections are documented in the changelog. Raw records and fingerprints remain available so users can audit remapping.

## Legacy Readers

The v1 compatibility helpers can read the documented v0.2 source and canonical record shapes. Compatibility does not guarantee that every obsolete agency field remains meaningful; records are still validated against current canonical semantics.

## Deprecation

Public APIs should be marked deprecated for at least one minor release before removal when practical. Security or legal issues can require immediate removal; those changes receive an advisory and changelog entry.
