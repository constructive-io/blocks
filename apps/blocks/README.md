# Blocks docs

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/blocks/actions/workflows/ci.yml">
    <img height="20" src="https://github.com/constructive-io/blocks/actions/workflows/ci.yml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/blocks/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
</p>

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

The development command builds the local package outputs before Next.js starts,
so it also works from a fresh worktree.

`src/lib/base-primitives.ts`, `src/lib/billing-blocks.ts`, and
`src/lib/feature-packs.ts` are the documentation catalogs. `pnpm gen:check`
regenerates (or checks) generated UI demo source used by the docs app.

From the repository root,
`pnpm --silent console-kit:inspect --item <registry-root>`
builds the aggregate registry and emits a deterministic agent-readable install
plan. `pnpm check:console-kit-inspector` verifies that every Console Kit core,
module, preset, umbrella, and standalone pack remains documented and resolves
to its exact registry closure, canonical compatibility manifests and preset
profiles. Inspector file entries distinguish consumer project-root targets from
targets resolved through the shadcn aliases in `components.json`, and retain
their canonical registry source paths for drift diagnosis.

The static Pages build uses `/blocks` as its deployment base path. Publishing npm packages remains a separate manual
release step.
