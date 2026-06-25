# OpenTrade Registry Docs

These docs explain how the project models official sources, writes adapters, and keeps source context attached to normalized records.

## Start Here

- [Architecture](architecture.md): how the registry, adapters, canonical records, and CLI fit together.
- [Current Project State](current-state.md): current source counts, implemented adapters, hosted behavior, and safety invariants.
- [Canonical Schema](canonical-schema.md): what a normalized record keeps and why raw records stay attached.
- [Source Registry](source-registry.md): how official sources are described before and after adapter support exists.
- [Source Research Template](source-research-template.md): the checklist to use before adding a new source.
- [Adapter Authoring](adapter-authoring.md): practical guidance for writing a source adapter.
- [Adapter Candidate Priorities](adapters/candidate-priorities.md): current registry-derived queue for future fixture adapters.
- [California CSLB Adapter Plan](adapters/california-cslb.md): early notes for a future California adapter.
- [Oregon CCB Adapter Notes](adapters/oregon-ccb.md): fixture support and active-source caveats for Oregon CCB.
- [Texas TDLR Adapter Notes](adapters/texas-tdlr.md): fixture support and source caveats for Texas TDLR.
- [Washington L&I Adapter Notes](adapters/washington-lni.md): fixture support and source caveats for Washington L&I.
- [Legal And Data Use](legal-and-data-use.md): readable data-use guardrails.
- [Hosted Deployment](deployment/vercel-supabase.md): Vercel hosting and optional database setup.
- [Storage](storage.md): optional SQLite storage helpers and local-cache boundaries.
- [Florida DBPR URL Sync](florida-dbpr-url-sync.md): explicit opt-in URL sync and verification behavior plus operational guardrails.
- [Release Checklist](release-checklist.md): practical pre-tag verification steps.
- [Roadmap](roadmap.md): modest release goals.
- [Release Process](release-process.md): release checklist.
- [Package Publishing](package-publishing.md): dry-run packaging checks.

## Current Boundary

The project works from local files by default. URL sync and URL verification require an explicit `--allow-network` flag, and default tests do not download live agency files. The current registry covers all states plus DC and five major U.S. territories, but only implemented adapters can sync or verify records.
