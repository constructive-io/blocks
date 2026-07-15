# Constructive Blocks Repository Guide

This public monorepo owns the Constructive Blocks documentation, the
`@constructive` shadcn registry, and the `@constructive-io/ui` and
`@constructive-io/schema-builder` packages.

## Invariants

- Canonical source lives in `apps/blocks`, `packages/ui`, and
  `packages/schema-builder`; do not edit generated registry output.
- Keep the registry collision-free and `@constructive`-namespaced.
- Preserve registry requirements sidecars.
- Never auto-discover or mutate sibling repositories from flow tooling.
- Keep generated SDK fixtures pruned and normal CI independent of live endpoints.
- Never add automated npm publishing; publish verified tarballs manually.

## Verification

Use Node 22 and pnpm 10.28.0, then run `pnpm check`, `pnpm build:pages`, and
`pnpm pack:local` before release-related changes.
