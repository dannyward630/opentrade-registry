# @opentrade/adapter-il-idfpr

Fixture adapter for Illinois IDFPR roofing contractor license records.

This package is intentionally local-first. It parses a tiny hand-authored CSV fixture shaped around IDFPR roofing-contractor lookup concepts and maps rows into OpenTrade canonical records. It does not access the live IDFPR lookup or bulk lookup service.

## Usage

```ts
import { illinoisIdfprRoofingContractorsAdapter } from "@opentrade/adapter-il-idfpr";
```

CLI example:

```bash
corepack pnpm cli -- sync us.il.idfpr.roofing_contractors \
  --file packages/adapter-il-idfpr/fixtures/roofing-contractors-sample.csv \
  --out ./illinois.jsonl
```

## Scope

- Source ID: `us.il.idfpr.roofing_contractors`
- Agency: Illinois Department of Financial and Professional Regulation
- Current maturity: `fixture_adapter`
- Current quality: Level 4 verification semantics
- Network behavior: no live lookup, no bulk download, no browser automation

The adapter is scoped to roofing-contractor-shaped records. It does not represent every Illinois contractor, skilled-trade, local permit, or business registration source.
