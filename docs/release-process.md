# Release Process

## Responsibilities

The release maintainer verifies source truth, package contents, security state, hosted parity, changelog, signatures, npm provenance, and GitHub release artifacts. A second reviewer should approve contract or source-semantic changes when available.

## Prepare

1. Update package versions and `CHANGELOG.md`.
2. Regenerate source artifacts:

   ```bash
   corepack pnpm db:seed:generate
   corepack pnpm source:matrix
   ```

3. Run:

   ```bash
   corepack pnpm verify
   corepack pnpm pack:check
   corepack pnpm security:audit
   corepack pnpm audit --prod
   ```

4. Confirm GitHub CI, CodeQL, dependency, and secret-scanning state.
5. Merge through a reviewed PR with no generated public-record datasets.

## Publish

1. Create a signed annotated tag: `git tag -s v1.0.0 -m "OpenTrade Registry v1.0.0"`.
2. Push the tag from clean `main`.
3. The release workflow rebuilds, verifies, packs, and publishes public packages with npm provenance and `access=public`.
4. Create the GitHub release from the signed tag and changelog.
5. Attach checksums for code/package artifacts only. Do not attach generated agency datasets.
6. Install the published CLI and packages in a clean directory and execute imports plus `opentrade help`.

If npm organization access, package ownership, signing, or provenance fails, stop the release and fix the external prerequisite. Do not publish partial versions under inconsistent numbers.

## Hosted Metadata

After merge, apply the deterministic seed to the optional Supabase mirror, deploy Vercel, and verify production `/api/health` reports file/database count and metadata parity. Hosted parity is release evidence, not a dependency of local packages.

## Rollback

Do not move or recreate a published tag. Publish a patch release. Deprecate a broken npm version when appropriate, document impact, and follow [incident response](incident-response.md) for security or data-integrity failures.
