# Release Checklist

- [ ] Versions and changelog are aligned.
- [ ] Source matrix and Supabase seed are regenerated and clean.
- [ ] `corepack pnpm verify` passes.
- [ ] `corepack pnpm pack:check` installs all 11 tarballs cleanly.
- [ ] Development and production dependency audits pass.
- [ ] No high/critical Dependabot, CodeQL, or secret-scanning alert is unresolved.
- [ ] The required Node 20/Linux pull-request gate, including dependency review, and the latest applicable post-merge CodeQL scan are green.
- [ ] The Node 24 release workflow verifies and clean-installs every package artifact.
- [ ] All 163 sources have terminal outcomes.
- [ ] `corepack pnpm board:inventory:require-complete` passes with no source-baseline inventory rows.
- [ ] All implemented adapters are Level 4 and none are fixture-only terminal outcomes.
- [ ] CLI file, cache, and explicit-network behavior is covered offline.
- [ ] No generated dataset, SQLite cache, credential, or bulk download is staged.
- [ ] No-match language remains neutral.
- [ ] Signed tag points to clean reviewed `main`.
- [ ] npm provenance and clean installation succeed.
- [ ] GitHub release notes and artifact checksums are published.
- [ ] Optional Supabase seed and Vercel `/api/health` show metadata parity.
