# Constructive Blocks Repository Guide

This public monorepo owns the Constructive Blocks documentation, the
`@constructive` shadcn registry, and the `@constructive-io/ui` and
`@constructive-io/schema-builder` packages.

## Invariants

- `apps/blocks`, `packages/ui`, and `packages/schema-builder` are canonical
  source trees; generated registry output is never edited.
- The combined registry must remain collision-free and every install command
  must use the `@constructive` namespace.
- Registry requirements sidecars are part of the public contract.
- Flow outputs outside this repository are generated only when explicit output
  environment variables are supplied.
- Generated SDK fixtures are intentionally pruned. Refresh them explicitly;
  do not add complete SDK trees or make normal CI depend on live endpoints.
- npm packages are versioned with Lerna and published manually from locally
  verified tarballs. Do not add automated npm publishing.

## Commands

```bash
pnpm check
pnpm check:full
pnpm build:pages
pnpm build:storybook
pnpm pack:local
```

Use Node 24 LTS and pnpm 10.28.0.
