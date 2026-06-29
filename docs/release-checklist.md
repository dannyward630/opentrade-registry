# Release Checklist

- [ ] Versions and changelog are aligned.
- [ ] Source matrix and Supabase seed are regenerated and clean.
- [ ] `corepack pnpm verify` passes.
- [ ] `corepack pnpm pack:check` installs all 11 tarballs cleanly.
- [ ] Development and production dependency audits pass.
- [ ] No high/critical Dependabot, CodeQL, or secret-scanning alert is unresolved.
- [ ] Node 20/22/24 CI is green on Linux, macOS, and Windows.
- [ ] All 56 sources have terminal outcomes.
- [ ] All implemented adapters are Level 4 and none are fixture-only terminal outcomes.
- [ ] CLI file, cache, and explicit-network behavior is covered offline.
- [ ] No generated dataset, SQLite cache, credential, or bulk download is staged.
- [ ] No-match language remains neutral.
- [ ] Signed tag points to clean reviewed `main`.
- [ ] npm provenance and clean installation succeed.
- [ ] GitHub release notes and artifact checksums are published.
- [ ] Optional Supabase seed and Vercel `/api/health` show metadata parity.
