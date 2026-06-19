# OpenTrade Registry Documentation

This directory collects the public design, usage, and data-use notes for OpenTrade Registry.

## Start Here

- [Architecture](architecture.md): source registry, adapters, canonical schema, CLI, and local-first exports.
- [Canonical Schema](canonical-schema.md): normalized record shape and provenance fields.
- [Source Registry](source-registry.md): metadata model for official public agency sources.
- [Adapter Authoring](adapter-authoring.md): how source adapters should be structured and tested.
- [Legal And Data Use](legal-and-data-use.md): source caveats, redistribution posture, and careful language.
- [Florida DBPR URL Sync Design](florida-dbpr-url-sync.md): future network-sync design, disabled in v0.1.
- [Roadmap](roadmap.md): staged project direction.
- [Release Process](release-process.md): release steps once package publishing begins.
- [Package Publishing](package-publishing.md): dry-run packaging checks and npm readiness.

## Current Boundaries

OpenTrade Registry v0.1 is local-first and fixture-driven. It does not download live agency files during normal commands or tests, and it does not publish generated datasets.

