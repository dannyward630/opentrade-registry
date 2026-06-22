# Release Process

OpenTrade Registry is pre-1.0. Releases should be boring, reproducible, and honest about source coverage.

## Checklist

1. Update `CHANGELOG.md` with user-facing changes.
2. Run the full local gate:

   ```bash
   corepack pnpm verify
   ```

3. Inspect source quality and package contents:

   ```bash
   corepack pnpm source:quality
   corepack pnpm pack:check
   ```

4. Confirm no generated bulk datasets are staged.
5. Confirm source metadata does not overstate coverage or redistribution rights.
6. Run the public CLI fixture examples from [release-checklist.md](release-checklist.md).
7. Confirm CI is green on `main`.

The default release gate must not require live agency network access, Supabase credentials, Vercel credentials, browser automation, hidden local files, or generated public-record datasets.

See [release-checklist.md](release-checklist.md) for the practical pre-tag command list.

## Versioning

Use semantic versioning once packages are published. Before 1.0, minor versions may still introduce breaking API changes, but they should be called out in the changelog.

## First npm Publication

Before publishing for the first time, confirm package names, npm organization access, and provenance settings. Publish the code packages only. Do not publish generated datasets as release artifacts unless the source clearly allows it.
