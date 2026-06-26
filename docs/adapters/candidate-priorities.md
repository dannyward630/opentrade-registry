# Adapter Candidate Priorities

This page turns `corepack pnpm source:quality` output into a human review queue for the next adapters. Candidate status is not an approval to scrape, redistribute, or publish generated datasets. It only means the registry metadata suggests a source may be practical after source-specific terms, file shape, fixture safety, filtering, and verification caveats are reviewed.

Default implementation rule: start fixture-first from tiny hand-authored records that mirror official field names. Keep live downloads opt-in, keep tests offline, and preserve source URL, fetched time, caveats, raw record, and fingerprint.

## Current Queue

| Priority | Source ID | Why It Is Plausible | Main Review Before Code |
| --- | --- | --- | --- |
| 1 | `us.ak.commerce.construction_contractors` | Alaska CBPL search metadata indicates construction contractor records and download-shaped access may exist. | Confirm exact download format, contractor endorsement modeling, and separation from business-license and corporation records. |
| 2 | `us.il.idfpr.roofing_contractors` | Illinois IDFPR documents lookup and bulk lookup paths, scoped here to roofing contractor licensing. | Confirm roofing-specific export availability, columns, update freshness text, and whether other Illinois trade sources need separate entries. |
| 3 | `us.in.pla.professional_licenses` | Indiana PLA references professional license verification, downloads, and API-shaped access. | Narrow construction-relevant credential types and confirm local-license exclusions, access requirements, and download/API terms. |

## Required Evidence To Promote A Candidate

A registry-only candidate can become a fixture adapter only after maintainers can point to:

- official source and documentation URLs already present in the source registry entry;
- a reviewed source scope that says what the adapter includes and excludes;
- a tiny hand-authored fixture that uses official field names but does not copy bulk public rows;
- a parser and mapper that validate canonical records and preserve raw input;
- neutral verification wording for matched, not-found, ambiguous, and invalid-input outcomes;
- tests that run without live agency network access;
- updated registry metadata, coverage status, package docs, and source-quality expectations.

California CSLB and Minnesota DLI have moved out of this queue as fixture adapters. They still need live file-shape research before any local-file or opt-in-network promotion.

## Candidate Caveats

Bulk-shaped does not mean complete. Some exports span many professions, include non-license records, or omit companion files needed to interpret status. Lookup-shaped sources with a download option still need legal and technical review before automation. When terms or redistribution rights are unclear, keep generated data local and mark redistribution as `unknown`.

The correct no-match language remains:

> No matching record was found in this source as of the checked time.

Do not convert a no-match result into a public accusation or a claim that no license exists anywhere.
