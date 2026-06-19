# Release Process

OpenTrade Registry is pre-1.0. Packages are not published yet, but release work should be reproducible from `main`.

## Release Checklist

1. Confirm `CHANGELOG.md` describes user-facing changes.
2. Run the full local gate:

   ```bash
   corepack pnpm verify
   ```

3. Confirm package contents without publishing:

   ```bash
   corepack pnpm pack:check
   ```

4. Confirm no generated bulk datasets are staged.
5. Confirm source metadata does not overclaim redistribution rights.
6. Confirm CI is green on `main`.

## Versioning

Use semantic versioning once packages are published. While the project is pre-1.0, minor versions may introduce breaking API changes, but they should still be documented in the changelog.

## Publishing Later

Before first npm publication:

- Confirm package names and ownership.
- Confirm npm organization access.
- Decide whether provenance signing is required.
- Run package dry-runs and inspect included files.
- Publish code packages only, not generated datasets.

