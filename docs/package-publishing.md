# Package Publishing

OpenTrade v1 contains 14 public packages: core, registry orchestration, SQLite storage, CLI, and ten adapters.

`corepack pnpm pack:check` discovers every public workspace package, creates pnpm-rewritten tarballs in a temporary directory, rejects workspace protocols and development-only files, installs all tarballs into a clean project, imports every library, and runs packed CLI help.

## Provenance

Each public package declares public access and provenance. The tag-triggered GitHub workflow uses Node 24, npm registry authentication, and OIDC `id-token: write` permission.

Never publish from an unverified dirty checkout. Never include generated agency records, local SQLite files, credentials, or live source downloads.

## Package Order

Publish all packages at one version. Workspace dependencies are rewritten during pnpm packing/publishing. A failed partial publication must be resolved before tagging another release.

## Acceptance

After publication:

```bash
npm install @opentrade-registry/core @opentrade-registry/registry @opentrade-registry/storage-sqlite @opentrade-registry/cli
npx opentrade help
```

Confirm package provenance on npm and compare published tarball integrity with workflow output.
