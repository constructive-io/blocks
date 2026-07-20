# Blocks docs

This Next.js app is the clean documentation surface for the Constructive UI foundation. It intentionally exposes only
the landing page, setup guidance, and the 29 base primitive pages while the complete block catalog remains available
through the public registry.

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

`src/lib/base-primitives.ts` is the single docs catalog. `pnpm gen:check` validates that every entry has an npm export,
a registry item, and a preview that imports the npm subpath. The SDK fixture and mutation-selection checks remain in
place for the canonical block source under `src/blocks`.

The static Pages build uses `/blocks` as its deployment base path. Publishing npm packages remains a separate manual
release step.
