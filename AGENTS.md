# Constructive Blocks Repository Guide

This public monorepo owns the Constructive Blocks documentation, the
`@constructive` shadcn registry, and the `@constructive-io/ui`,
`@constructive-io/data`, and `@constructive-io/sheets` packages. The local
schema-builder package remains in the workspace but is not part of the public
registry.

## Invariants

- Canonical public source lives in `apps/blocks`, `packages/ui`,
  `packages/data`, and `packages/sheets`; do not edit generated registry output.
- Keep the registry collision-free and `@constructive`-namespaced.
- Preserve the seven feature-pack manifests and four experimental preset
  profiles installed under `.constructive/feature-packs`.
- Never auto-discover or mutate sibling repositories from flow tooling.
- Keep normal CI independent of generated SDKs and live endpoints.
- Never add automated npm publishing; publish verified tarballs manually.

## Verification

Use Node 24 LTS and pnpm 10.28.0, then run `pnpm check`, `pnpm build:pages`, and
`pnpm pack:local` before release-related changes.
