# Constructive Blocks Repository Guide

This public monorepo owns the Constructive Blocks documentation, the
`@constructive` shadcn registry, and the `@constructive-io/ui`,
`@constructive-io/data`, `@constructive-io/sheets`,
`@constructive-io/command-palette`, and `@constructive-io/schema-builder`
packages. Schema Builder is also distributed as editable source through the
public registry and binds to each host through an explicit adapter.

## Invariants

- `apps/blocks`, `packages/ui`, `packages/data`, `packages/sheets`,
  `packages/command-palette`, and `packages/schema-builder` are canonical public
  source trees; generated registry output is never edited.
- The combined registry must remain collision-free and every install command
  must use the `@constructive` namespace.
- Feature-pack and preset manifests installed under
  `.constructive/feature-packs` are part of the public contract.
- Flow outputs outside this repository are generated only when explicit output
  environment variables are supplied.
- Blocks use injected endpoints, sessions, and adapters. Do not add generated
  SDK trees or make normal CI depend on live endpoints.
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
