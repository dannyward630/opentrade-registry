# Source Registry

The source registry is the machine-readable catalog of official public sources and their current terminal decisions.

## v1 Completion Model

Every source must end in exactly one outcome:

- `production_ready`
- `network_opt_in`
- `local_file_adapter`
- `blocked`
- `deprecated`

Provisional planning outcomes are not valid v1 source decisions. A blocker is a completed outcome only when its code, summary, evidence URLs, review date, next review date, scope limits, and redistribution posture are present.

## Required Evidence

Each v1 entry records:

- stable source ID and jurisdiction;
- official agency, source, documentation, and lookup URLs where available;
- official terms URL or explicit notes explaining its absence;
- source type and access controls;
- coverage and known exclusions;
- update and rate-limit notes;
- redistribution status, conservatively `unknown` unless confirmed;
- research review and next-review dates;
- official evidence URLs and notes;
- adapter maturity and quality;
- terminal outcome;
- blocker code, summary, and evidence for blocked sources.

Municipal licensing is excluded unless separately registered. Statewide coverage describes the agency scope, not every credential that may exist within a jurisdiction.

## Capability And Quality

Capability values describe runnable behavior. Quality levels describe review depth.

- Level 0: metadata or terminal blocker only.
- Level 1: fixture parsing and normalization.
- Level 2: official local-file support.
- Level 3: explicit official-network support with provenance.
- Level 4: reviewed verification language and source caveats.

Implemented v1 adapters must be Level 4 and must not remain fixture-only terminal outcomes.

## Blocker Codes

Blockers distinguish why an adapter is not defensible, including unclear terms, access controls, technical instability, no stable source, or lack of a contractor-specific source. Public availability alone does not establish automation or redistribution rights.

Do not bypass CAPTCHAs, accounts, login walls, paywalls, or technical controls. Do not infer permission from a missing terms link.

## Coverage Indexes

The state/DC and territory indexes contain one row per tracked jurisdiction and reference source IDs. `corepack pnpm coverage:health` checks completeness, cross-links, directory/state consistency, and terminal maturity alignment.

The current registry contains `72` terminal entries: `9` implemented Level 4 adapters and `63` blockers. See the generated [source-status matrix](source-status-matrix.md).

## Updating A Source

1. Revisit official URLs and terms.
2. Update evidence and review dates.
3. Preserve exclusions and redistribution uncertainty.
4. Update the coverage index if capability changes.
5. Add or update adapter fixtures and tests where applicable.
6. Run:

   ```bash
   corepack pnpm db:seed:generate
   corepack pnpm source:matrix
   corepack pnpm verify
   ```

The generated Supabase seed and status matrix must remain deterministic and synchronized with source JSON.
