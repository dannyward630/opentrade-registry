# Adapter Candidate Priorities

This page turns `corepack pnpm source:quality` output into a human review queue for the next adapters. Candidate status is not an approval to scrape, redistribute, or publish generated datasets. It only means the registry metadata suggests a source may be practical after source-specific terms, file shape, fixture safety, filtering, and verification caveats are reviewed.

Default implementation rule: start fixture-first from tiny hand-authored records that mirror official field names. Keep live downloads opt-in, keep tests offline, and preserve source URL, fetched time, caveats, raw record, and fingerprint.

## Current Queue

`corepack pnpm source:quality` currently reports no unimplemented bulk-shaped adapter candidates. That is a healthy queue state, not a completion claim. The next adapter candidate should come from fresh source research, territory follow-up, or a deeper review of an existing lookup-only entry that discovers a lawful, stable, fixture-safe field shape.

## Required Evidence To Promote A Candidate

A registry-only candidate can become a fixture adapter only after maintainers can point to:

- official source and documentation URLs already present in the source registry entry;
- a reviewed source scope that says what the adapter includes and excludes;
- a tiny hand-authored fixture that uses official field names but does not copy bulk public rows;
- a parser and mapper that validate canonical records and preserve raw input;
- neutral verification wording for matched, not-found, ambiguous, and invalid-input outcomes;
- tests that run without live agency network access;
- updated registry metadata, coverage status, package docs, and source-quality expectations.

Alaska CBPL, California CSLB, Illinois IDFPR, Indiana PLA, Minnesota DLI, Oregon CCB, Texas TDLR, and Washington L&I have moved out of this queue as fixture adapters. They still need live file-shape, download/API, protected-endpoint, or companion-source research before any local-file or opt-in-network promotion.

## Candidate Caveats

Bulk-shaped does not mean complete. Some exports span many professions, include non-license records, or omit companion files needed to interpret status. Lookup-shaped sources with a download option still need legal and technical review before automation. When terms or redistribution rights are unclear, keep generated data local and mark redistribution as `unknown`.

The correct no-match language remains:

> No matching record was found in this source as of the checked time.

Do not convert a no-match result into a public accusation or a claim that no license exists anywhere.
