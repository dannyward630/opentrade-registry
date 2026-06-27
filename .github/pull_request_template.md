## Summary

Describe the change and the source, adapter, CLI command, or documentation area it affects.

## Testing

- [ ] `corepack pnpm build`
- [ ] `corepack pnpm typecheck`
- [ ] `corepack pnpm test`
- [ ] `corepack pnpm registry:validate`
- [ ] `corepack pnpm cleanliness:scan`
- [ ] `corepack pnpm pack:check` when package contents or public APIs change
- [ ] `corepack pnpm security:audit` when dependencies or security-sensitive paths change

## Data-Use Checklist

- [ ] No generated bulk dataset is added.
- [ ] Source URLs, caveats, raw records, and fingerprints are preserved where relevant.
- [ ] No network test is required by default.
- [ ] No claim treats absence from one source as proof that a license does not exist.
