# Nationwide Board Inventory

`registry/board-inventory.json` is the machine-readable v2 inventory of statewide contractor and skilled-trade boards. It is separate from the source registry because one regulator may expose several sources and one state may have several independent boards.

## Current Completeness

The inventory currently has `completeness: "representative_source_baseline"`. Its 56 rows migrate every existing state, DC, and major-territory source into the board model. This proves source linkage and terminal access-path handling, but it does not yet claim every material statewide trade board has been identified.

The inventory may change to `board_complete` only after every tracked jurisdiction has been reviewed for general contracting, residential, electrical, plumbing, HVAC, mechanical, roofing, solar, asbestos, pool/spa, home-improvement, and other independently regulated statewide trades. Each additional board needs official evidence and a terminal access path.

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
```

The generator is intentionally conservative: a blocked source with an official lookup becomes a manual handoff, not an automated browser source. Browser automation requires a separate access-control and terms review under the v2 source contract.
