# Blocks docs

This Next.js app documents the Constructive Blocks registry: the UI foundation,
29 base primitives, customer billing blocks, seven capability-aligned feature
packs, and Console Kit.

The same primitive implementation is shown through two distribution modes:

- npm consumers import `@constructive-io/ui/<name>` and the package stylesheet.
- shadcn consumers install `@constructive/<name>` as editable source without preinstalling the npm package.

## Development

```bash
pnpm --filter blocks dev
pnpm --filter blocks lint:types
pnpm --filter blocks test
pnpm --filter blocks build:pages
```

`src/lib/base-primitives.ts`, `src/lib/billing-blocks.ts`, and
`src/lib/feature-packs.ts` are the documentation catalogs. `pnpm gen:check`
validates primitive distribution and keeps the feature-pack docs aligned with
their manifests, registry roots, and live previews.

The static Pages build uses `/blocks` as its deployment base path. Publishing npm packages remains a separate manual
release step.
