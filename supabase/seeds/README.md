# Database Seeds

`registry_sources.sql` is generated from `registry/sources`. It contains public source metadata only.

Regenerate it from the repository root after source registry changes:

```bash
node scripts/generate-registry-source-seed.mjs
```

Apply it only to databases intended to mirror the public source registry. It does not include generated public-record datasets.
