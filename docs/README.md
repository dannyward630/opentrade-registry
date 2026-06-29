# OpenTrade Registry Documentation

## Project Contracts

- [Current State](current-state.md)
- [Architecture](architecture.md)
- [Compatibility Policy](compatibility-policy.md)
- [Canonical Schema](canonical-schema.md)
- [Programmatic API](api-reference.md)
- [Source Registry](source-registry.md)
- [Generated Source Status Matrix](source-status-matrix.md)
- [Local SQLite Storage](storage.md)
- [v0.2 to v1 Migration](migration-v0.2-to-v1.md)
- [v1 to v2 Migration](migration-v1-to-v2.md)

## Source And Adapter Work

- [Source Research Template](source-research-template.md)
- [Source Review Cadence](source-review-cadence.md)
- [Adapter Authoring](adapter-authoring.md)
- [Arizona ROC](adapters/arizona-roc.md)
- [Alaska CBPL](adapters/alaska-commerce.md)
- [California CSLB](adapters/california-cslb.md)
- [Florida DBPR Network Sync](florida-dbpr-url-sync.md)
- [Illinois IDFPR](adapters/illinois-idfpr.md)
- [Indiana PLA](adapters/indiana-pla.md)
- [Minnesota DLI](adapters/minnesota-dli.md)
- [Oregon CCB](adapters/oregon-ccb.md)
- [Texas TDLR](adapters/texas-tdlr.md)
- [Washington L&I](adapters/washington-lni.md)

## Operations And Governance

- [Legal And Data Use](legal-and-data-use.md)
- [Operational Runbook](operations.md)
- [Security Incident Handling](incident-response.md)
- [Vercel And Supabase Deployment](deployment/vercel-supabase.md)
- [Release Process](release-process.md)
- [Release Checklist](release-checklist.md)
- [Package Publishing](package-publishing.md)
- [Roadmap](roadmap.md)

Core workflows are local-first. File, cache, and fixture tests run offline. Network use is explicit, and hosted metadata is optional.
