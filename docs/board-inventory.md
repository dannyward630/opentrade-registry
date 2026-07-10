# Nationwide Board Inventory

`registry/board-inventory.json` is the machine-readable v2 inventory of statewide contractor and skilled-trade boards. It is separate from the source registry because one regulator may expose several sources and one state may have several independent boards.

## Current Completeness

The inventory currently has `completeness: "representative_source_baseline"`. Its 163 rows preserve every existing state, DC, and major-territory source link; one Arizona Registrar of Contractors row has been independently audited and the remaining rows are deterministic source baselines. This does not yet claim every material statewide trade board has been identified.

Every inventory row declares its evidence level:

- `source_baseline`: a deterministic source-to-inventory row. It is useful for traceability, but it is not an independently audited regulatory-board assertion.
- `board_verified`: an independently reviewed regulatory board or agency program. Only these rows may appear in an inventory marked `board_complete`.
- `deprecated`: a retained historical identity with a documented replacement or terminal end state. Deprecated rows cannot appear in a board-complete inventory.

Rows also state whether their identity is a `regulatory_board`, `agency_program`, or `source_endpoint`. The generated baseline uses `source_endpoint`; a board-complete inventory must consolidate and audit those entries into regulatory-board or agency-program identities. This prevents a source count from being mistaken for a nationwide board count.

`registry/board-audits.json` contains the reviewed rows that replace generated source baselines. An audit may consolidate one or more same-jurisdiction source IDs into a single board identity. It must cite official evidence, state a terminal access path, and use `regulatory_board` or `agency_program`; the generator rejects unknown, duplicate, or cross-jurisdiction source links.

The board-coverage ledger now resolves all `784` jurisdiction/domain decisions with terminal, dated evidence. American Samoa is fully resolved with DPW contractor-board and specialty-classification evidence plus solar, pool/spa, and asbestos boundaries. Guam is fully resolved with CLB general engineering, general building, and specialty contractor classification evidence. Missouri is fully resolved with statewide electrical and asbestos evidence plus explicit local-only contractor boundaries. New York is fully resolved with DOL asbestos evidence and explicit local-only contractor and skilled-trade boundaries. Northern Mariana Islands is fully resolved with DPW Building Safety Code manual-handoff evidence plus explicit local-only trade boundaries. Oklahoma is fully resolved with CIB trade licensing, ODOL asbestos evidence, and explicit local-only general-contractor boundaries. Puerto Rico is fully resolved with DACO contractor registration, Department of State examining-board trade evidence, DRNA asbestos evidence, and local-only boundaries. South Dakota is fully resolved with DLR electrical, DLR plumbing, DANR asbestos evidence, and explicit local-only trade boundaries. The U.S. Virgin Islands is fully resolved with DLCA contractor/trade evidence plus an EPA/DPNR asbestos boundary. Vermont is fully resolved with SOS residential contractor registration, DFS trade licensing, Health asbestos/lead evidence, and explicit local-only statewide-contractor boundaries. Wyoming is fully resolved with State Fire Marshal electrical evidence, DEQ asbestos evidence, and explicit local-only contractor boundaries. The District of Columbia is fully resolved with DLCP contractor, Industrial Trades, and asbestos abatement business licensing evidence plus DOEE and DOB permit caveats. Municipal licensing remains excluded.

The board-coverage ledger is `board_complete`; the generated inventory remains a representative source baseline until every material statewide board, not only every current jurisdiction/domain decision, has been independently audited and split where needed.

`registry/board-coverage.json` is the completion ledger. It expands every state, DC, and tracked territory across 14 required trade domains. A `board_complete` ledger removes the research default and provides an explicit terminal decision for every jurisdiction/domain pair.

Terminal coverage decisions are:

- `covered_by_board`: one or more IDs in `board-inventory.json` regulate the domain;
- `not_state_regulated`: official evidence shows no statewide regulator for the domain;
- `local_only`: official evidence shows licensing is handled below the state or territory level and remains outside scope.

Every terminal decision requires dated official evidence. Covered decisions must reference registered board IDs. The public [board coverage matrix](board-coverage-matrix.md) shows resolved and unresolved counts without inferring coverage from broad source names.

Municipal and county licensing is explicitly excluded unless a source is separately registered.

## Access Paths

- `production_adapter`: the source is suitable for normal production ingestion.
- `network_opt_in`: the source supports explicit, allowlisted network ingestion.
- `local_file`: an official file can be imported locally, but source acquisition remains caller-managed.
- `browser_lookup`: a public lookup may be automated without bypassing technical controls.
- `manual_handoff`: the official lookup is available, but OpenTrade directs the user to it instead of automating it.
- `blocked`: evidence shows no defensible automated or manual source path.
- `deprecated`: the board/source is no longer current and has a documented replacement or end state.

## Maintenance

Regenerate the baseline after source metadata changes:

```bash
corepack pnpm board:inventory:generate
corepack pnpm board:inventory:check
corepack pnpm board:inventory:report
corepack pnpm board:coverage:check
corepack pnpm board:coverage:matrix
corepack pnpm board:coverage:require-complete
```

The generator is intentionally conservative: a blocked source with an official lookup becomes a manual handoff, not an automated browser source. Browser automation requires a separate access-control and terms review under the v2 source contract.

`corepack pnpm board:inventory:require-complete` is a release-only assertion. It fails until every source-baseline row is independently audited and the inventory itself is marked `board_complete`. `corepack pnpm board:coverage:require-complete` also requires both the trade-domain ledger and this inventory to satisfy that threshold.
