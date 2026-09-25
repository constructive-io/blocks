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
- The docs app's Tailwind only scans `packages/ui/dist` plus `apps/blocks/src`.
  Registry-only `packages/ui/src/components/*` trees rendered through the
  `@/components/ui/*` alias (e.g. `agents-builder`, `billing-kit`) need an `@source` line in
  `apps/blocks/src/app/globals.css`, or their unique classes are missing.
  After adding an `@source` line, stop the dev server and delete
  `apps/blocks/.next/dev`: Turbopack's persistent cache keeps the old source list.
- Smoke-install one registry root: `SMOKE_CASE=<name> pnpm --filter
  @constructive-io/registry smoke:install` (add `SMOKE_REUSE_PACKED_ARTIFACTS=1`
  after the first run to skip repacking).
- `AnimateView` (`motion/react-animate-view`, motion >= 13.4) needs React 19.3.
  Never use it for route or page transitions. Use it only inside blocks where
  an element already shows/hides or crossfades (list swaps, step swaps, tab
  panels, reorders, shared elements), through a
  wrapper that falls back when `React.ViewTransition` is missing (see
  `workspace-kit/view-transition.tsx`). Keep interruptible micro-interactions
  on `motion/react` or CSS, and keep npm package peers usable on React 18.
  jsdom lacks `CSS.escape`, which React's ViewTransition calls; polyfill it in
  tests that render these boundaries.
- Workspace templates (`agents-builder`, `billing-account`, `billing-console`)
  share `packages/ui/src/components/workspace-kit` (shell, sidebar rail and
  drawer, view frames, filter pills, surfaces such as `Panel` and
  `TableSurface`, and the pan-and-zoom canvas used by Agents Builder and
  Org Chart). Billing leaves live in `billing-kit`. The kit is also the
  subpath-only npm export `@constructive-io/ui/workspace-kit` (it needs
  motion >= 13.4), so npm-built packages such as Schema Builder can import it.
  Import sibling registry trees by file (`../billing-kit/plan`), not by their
  `index.ts`: the UI registry build cannot resolve directory imports.
- Registry `registryDependencies` must match imports exactly; the registry
  build names any missing or stale edge.

## Testing

- Test behaviour through the public surface: render the component with props,
  interact as a user would, and assert on what they see or on the callbacks a
  host receives. Do not unit-test internal helpers, hooks, reducers, state
  shapes, or class names; those are implementation details.
- Keep tests few and meaningful. Prefer one flow-level test over many
  narrow ones, and skip a test when the browser check already covers it.
