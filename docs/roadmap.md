# Roadmap

OpenTrade Registry is early. The next releases should stay modest: make the first adapter reliable, make the registry useful, then add more sources without rushing into fragile live access.

## v0.1

- Core canonical schema.
- Source registry validation.
- Florida DBPR fixture adapter.
- JSONL and CSV export from a local file.
- Local-file license check.

## v0.2

- Registry coverage model.
- More researched state source entries.
- Better Florida DBPR local-file handling.
- Clearer import statistics and warnings.
- Explicit opt-in URL sync and verification with remote freshness metadata.
- Texas TDLR fixture adapter.
- Washington L&I fixture adapter.
- Oregon CCB fixture adapter.
- Researched registry entries for Oregon CCB, Nevada NSCB, North Carolina NCLBGC, and Virginia DPOR.
- Researched registry entries for Georgia SOS, Minnesota DLI, South Carolina LLR, Tennessee Commerce, and Utah DOPL.
- Researched registry entries for Alabama General Contractors Board, Louisiana LSLBC, Michigan LARA, Pennsylvania OAG, and Wisconsin DSPS.
- Researched registry entries for Arkansas ACLB, Colorado DORA, Iowa DIAL, Massachusetts OPSI, and Ohio OCILB.
- Researched registry entries for Connecticut DCP, Maryland MHIC, New Jersey DCA, New Mexico RLD, and West Virginia Labor.
- Researched registry entries for Alaska CBPL, Delaware Labor, DC DLCP, Idaho DOPL, and Rhode Island CRLB.
- Researched registry entries for Illinois IDFPR, Indiana PLA, Kansas Attorney General, Kentucky DHBC, and Mississippi MSBOC.
- Researched registry entries for Hawaii DCCA, Maine PFR, Missouri Professional Registration, Montana DLI, Nebraska DOL, New Hampshire OPLC, New York DOS, North Dakota SOS, Oklahoma CIB, South Dakota DLR, Vermont SOS, and Wyoming State Fire Marshal.
- Researched registry entries for American Samoa DOC, Guam CLB, CNMI BPL, Puerto Rico DACO, and U.S. Virgin Islands DLCA.
- Adapter quality metadata and Level 4 verification-semantics tests for all implemented adapters.

## v0.3

- Use the adapter candidate priorities guide to choose the next fixture adapter from California CSLB, Minnesota DLI, Alaska CBPL, Illinois IDFPR, or Indiana PLA.
- Promote only candidates with reviewed source terms, fixture-safe field shapes, source-specific filters, and neutral verification caveats.
- Deeper Oregon/Texas/Washington open-data support where it improves existing adapter reliability.
- Adapter quality badges.
- Shared import pipeline hardening, including row-level sync error reporting.
- More source registry and adapter metadata consistency checks.
- Possible SQLite cache research.

## v0.4

- Deeper U.S. territory source research, especially contractor-specific paths for American Samoa and CNMI.
- More fixture-supported adapters.
- Clear reporting for registry-only and adapter-supported sources.
- State expansion workflow documented well enough for new contributors to add research-first entries.

## v1.0

- All-state source registry coverage maintained with at least one researched official source entry for every state plus DC.
- Major U.S. territory source registry coverage maintained with conservative caveats.
- Stable adapter API.
- Stable canonical schema with a documented compatibility policy.
- No-network-by-default behavior preserved.

## Later

- SQLite or Postgres export packages.
- More state and local sources.
- Optional portal adapters where lawful and technically stable.
- Complaint and discipline data where the source terms, format, and caveats are understood.
