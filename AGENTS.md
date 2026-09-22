# Constructive Blocks Repository Guide

This public monorepo owns the Constructive Blocks documentation, the
`@constructive` shadcn registry, and the `@constructive-io/ui`,
`@constructive-io/data`, `@constructive-io/sheets`,
`@constructive-io/command-palette`, and `@constructive-io/schema-builder`
packages. Schema Builder is also distributed as editable source through the
public registry and binds to each host through an explicit adapter.

## Invariants

- Canonical public source lives in `apps/blocks`, `packages/ui`,
  `packages/data`, `packages/sheets`, `packages/command-palette`, and
  `packages/schema-builder`; do not edit generated registry output.
- Keep the registry collision-free and `@constructive`-namespaced.
- Preserve the reviewed feature-pack manifests and preset profiles installed
  under `.constructive/feature-packs`.
- Never auto-discover or mutate sibling repositories from flow tooling.
- Keep normal CI independent of generated SDKs and live endpoints.
- Never add automated npm publishing; publish verified tarballs manually.
- Keep `packages/blocks-schema`, `packages/blocks-renderer`, and
  `packages/json-schema-to-blocks` on the `makage` publish-from-`dist` layout:
  root-level entry points, no `exports` map.

## Verification

Use Node 24 LTS and pnpm 10.28.0, then run `pnpm check`, `pnpm build:pages`, and
`pnpm pack:local` before release-related changes.

## Local development

- Docs app: `pnpm --filter blocks dev` serves `http://localhost:3005` (the
  `predev` hook builds packages and checks generated demo source first).
- Open the dev server directly. Reverse proxies that do not forward Next's dev
  WebSocket/streaming requests (e.g. agent browser-preview proxies) return
  `502` on `/_next/webpack-hmr`, the client never hydrates, and client-only
  pages such as `/blocks/create` stay on their server-rendered skeleton.
- Storybook for `@constructive-io/ui`: `pnpm --filter @constructive-io/ui sb`
  (`http://localhost:6007`; the Kitchen Sink story carries the DialKit tuning panel).
