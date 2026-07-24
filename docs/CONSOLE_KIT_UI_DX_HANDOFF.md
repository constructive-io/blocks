# Console Kit UI and DX polish handoff

Status: 2026-07-23  
Audience: AI agents continuing the Blocks and Console Kit frontend work  
Implementation baseline: `5c676fb feat(console-kit): align blocks with feature packs`

This handoff starts after the feature-pack architecture, Console Kit runtime,
native tenant fixture, and RLS verification were completed. The next wave is a
frontend product pass: make the existing system feel cohesive, obvious, and
pleasant to install without changing the backend contract or weakening the
capability and RLS boundaries already proven.

## Problem statement

Constructive needs the application-database equivalent of Supabase Platform
Kit: a polished Next.js console that can be installed with shadcn, composed from
smaller blocks, and pointed at any compatible Constructive tenant database.
Constructive differs at the trust boundary. Console Kit runs as the tenant
user, discovers the public database surface from explicit endpoints, `_meta`,
and GraphQL introspection, and lets PostgreSQL grants and RLS remain
authoritative. It must never behave like a platform-operator console or infer
authority from a preset name.

The implementation is functionally complete enough for a UI/DX polish wave.
The work now is to improve visual hierarchy, responsive behavior, navigation,
form ergonomics, action feedback, loading/empty/error/degraded states,
diagnostics, installation guidance, and first-success time. Preserve the
provider-neutral `feature-pack-*` boundary and the one-store modular Console
Kit architecture while doing that work.

## Start here

- Continue in the isolated worktree at
  `/Users/phathag/workspace/constructive/blocks-feature-packs`.
- The branch is `feat/feature-packs-console-kit`.
- The completed implementation baseline is commit `5c676fb`.
- Do not accidentally switch to or edit the separate
  `/Users/phathag/workspace/constructive/blocks` worktree.
- `/Users/phathag/workspace/constructive/constructive-db` is the backend source
  of truth. It was clean at handoff and must remain read-only in this wave.
- Read `AGENTS.md`, `CLAUDE.md`,
  `docs/CONSOLE_KIT_BACKEND_COMPATIBILITY.md`, and
  `docs/CONSOLE_KIT_PLATFORM_KIT_GAPS.md` before changing code.

At handoff, the following services were intentionally left running:

| Service | Address |
| --- | --- |
| Blocks development app | `http://localhost:3005` |
| Constructive GraphQL from `fun up` | `http://localhost:6464` |
| PostgreSQL | `localhost:5432` |

Verify the processes rather than assuming they survived a later session.

## Current product surface

There are seven provider-neutral feature packs and seven matching Console Kit
modules:

| Standalone view | Console integration |
| --- | --- |
| `feature-pack-data` | `console-module-data` |
| `feature-pack-auth` | `console-module-auth` |
| `feature-pack-users` | `console-module-users` |
| `feature-pack-organizations` | `console-module-organizations` |
| `feature-pack-storage` | `console-module-storage` |
| `feature-pack-billing` | `console-module-billing` |
| `feature-pack-notifications` | `console-module-notifications` |

The standalone pack owns provider-neutral resources, policy, actions, and UI.
The Console module installs that view plus Console Kit integration: navigation,
capability discovery, Constructive adapters, `_meta` resolvers, and any
pack-owned Zustand slice.

Three public preset items mirror official backend compositions:

| Registry item | Console modules |
| --- | --- |
| `preset-auth-hardened` | Data, Auth, Users |
| `preset-b2b-storage` | Data, Auth, Users, Organizations, Storage |
| `preset-full` | All seven modules |

`console-kit-nextjs` is the one-command full install. `console-kit-core` plus
selected `console-module-*` items is the smaller custom composition path.
The current registry compiler emits 102 items and 103 JSON outputs including
the registry index.

Every Console Kit instance has one vanilla Zustand store assembled from core
and module slices. Database or identity changes clear scoped runtime caches,
construct fresh module state, and invalidate old slice action/getter closures.
Same-scope refreshes preserve state. Do not add per-pack providers, process-wide
stores, credentials in Zustand, or a second state system alongside this store.

“Works with any tenant database” means any tenant that supplies an explicit
semantic endpoint map and exposes the contracts a selected module requires. It
does not mean every installed backend module is automatically routed publicly,
nor that `_meta` or introspection proves the current user's runtime authority.

## Rendered routes

Use these as the primary visual review surface:

- Console Kit documentation:
  `http://localhost:3005/blocks/console-kit`
- Feature-pack catalog:
  `http://localhost:3005/blocks/features`
- Individual pack documentation:
  `http://localhost:3005/blocks/features/{data|auth|users|organizations|storage|billing|notifications}`
- Native tenant Console Kit:
  `http://localhost:3005/__integration/console-kit?profile={auth-hardened|b2b-storage|full|storage-routed}`

The integration route is a proof harness, not production UI. Use it to reach
real signed-out, authenticated, discovering, partial, unavailable, and
RLS-backed states, but do not polish the proof controls as if they shipped in a
consumer application.

Existing ignored visual baselines are under `.local/visual-qa/`:

- `console-kit-docs-desktop.png`
- `console-kit-live-desktop.png`
- `console-kit-live-mobile.png`
- `feature-packs-desktop.png`

Regenerate baselines after material UI changes; do not commit them unless the
user explicitly asks for versioned screenshots.

## Where to work

### Console shell and runtime UI

| Concern | Canonical source |
| --- | --- |
| Composition, feature navigation, loading and unavailable states | `apps/blocks/src/blocks/console-kit/console-kit.tsx` |
| Connection and endpoint details | `apps/blocks/src/blocks/console-kit/console-connection-menu.tsx` |
| Public host contract | `apps/blocks/src/blocks/console-kit/console-kit-contracts.ts` |
| Constructive tenant wrapper | `apps/blocks/src/blocks/console-kit/constructive/constructive-console-kit.tsx` |
| Module contract | `apps/blocks/src/blocks/console-kit/feature-module.ts` |
| Single modular store | `apps/blocks/src/blocks/console-kit/store/console-kit-store.tsx` and sibling slice files |
| Official compositions | `apps/blocks/src/blocks/presets/*-console-kit.tsx` |

The app chrome is canonical in `packages/ui`, not in generated registry output:

- `packages/ui/src/components/app-shell.tsx`
- `packages/ui/src/components/app-bar.tsx`
- `packages/ui/src/components/sidebar.tsx`
- `packages/ui/src/styles/globals.css`
- `packages/ui/src/theme.ts`

### Feature-pack UI

Shared state surfaces and policy/action contracts live in:

- `apps/blocks/src/blocks/feature-packs/shared/feature-pack-ui.tsx`
- `apps/blocks/src/blocks/feature-packs/shared/feature-pack-contracts.ts`

The main workflows are:

- Data: `apps/blocks/src/blocks/feature-packs/data/data-feature-pack.tsx`
- Auth entry and account:
  `apps/blocks/src/blocks/feature-packs/auth/auth-entry-panel.tsx` and
  `auth-account-view.tsx`
- Users: `apps/blocks/src/blocks/feature-packs/users/users-feature-pack.tsx`
- Organizations:
  `apps/blocks/src/blocks/feature-packs/organizations/organizations-feature-pack.tsx`
- Storage:
  `apps/blocks/src/blocks/feature-packs/storage/storage-feature-pack.tsx`
- Billing:
  `apps/blocks/src/blocks/feature-packs/billing/billing-feature-pack.tsx` and
  the mature blocks under `apps/blocks/src/blocks/billing/`
- Notifications:
  `apps/blocks/src/blocks/feature-packs/notifications/notifications-feature-pack.tsx`

Data's metadata and GraphQL compatibility layer lives in
`packages/data/src/schema-introspection-compatibility.ts`. Its CRUD grid and
PostGraphile adapter live in `packages/sheets`, especially
`packages/sheets/src/adapter/postgraphile-adapter.ts`. Preserve their
fail-closed behavior and enum normalization, while treating `_meta` operation
names as hints that must resolve to exact standard-introspection coordinates.

### Documentation and previews

| Surface | Canonical source |
| --- | --- |
| Console Kit page | `apps/blocks/src/app/blocks/console-kit/page.tsx` |
| Feature-pack index | `apps/blocks/src/app/blocks/features/page.tsx` |
| Shared pack docs layout | `apps/blocks/src/components/feature-pack-showcase/feature-pack-docs-page.tsx` |
| Preview host | `apps/blocks/src/components/feature-pack-showcase/feature-pack-showcase-preview.tsx` |
| Deterministic preview canvas | `apps/blocks/src/components/feature-pack-showcase/feature-pack-showcase-canvas.tsx` |
| Preview resources | `apps/blocks/src/components/feature-pack-showcase/feature-pack-showcase-resources.ts` |
| Pack documentation/API catalog | `apps/blocks/src/lib/feature-packs.ts` |
| Docs shell | `apps/blocks/src/components/site/{registry-shell,site-sidebar,site-topbar}.tsx` |

Billing documentation is the language and layout precedent. Compare against
`apps/blocks/src/components/billing-showcase/billing-block-docs-page.tsx` and
`apps/blocks/src/lib/billing-blocks.ts` before inventing a second docs style.

### Registry and install pipeline

Canonical registry input is `apps/blocks/registry.json`, together with
`packages/ui/registry.json`. The compiler and clean-install checks are in:

- `apps/registry/scripts/compiler.ts`
- `apps/registry/scripts/build.ts`
- `apps/registry/scripts/smoke-install.ts`
- `apps/registry/REGISTRY.md`

Do not hand-edit `apps/registry/registry/**` or
`apps/registry/public/r/*.json`; those are generated staging/output. A
pack-facing change commonly requires coordinated edits to its component or
module, `feature-pack.json`, `apps/blocks/src/feature-packs/catalog.ts`,
`apps/blocks/src/lib/feature-packs.ts`, and `apps/blocks/registry.json`.
`pnpm --filter blocks gen:check` catches most contract drift.

Consumers configure the namespace and install with shadcn 4.13.1 or newer:

```json
{
  "registries": {
    "@constructive": "https://constructive-io.github.io/blocks/r/{name}.json"
  }
}
```

```bash
pnpm dlx shadcn@4.13.1 add @constructive/console-kit-nextjs
pnpm dlx shadcn@4.13.1 add @constructive/preset-b2b-storage
pnpm dlx shadcn@4.13.1 add @constructive/console-module-users
pnpm dlx shadcn@4.13.1 add @constructive/feature-pack-users
```

Standalone feature-pack installs also write their reviewed compatibility
sidecar to `.constructive/feature-packs/<id>.json` in the consumer.

## External references

Use these for comparison and extraction, not blind copying:

- Supabase Platform Kit source:
  `/Users/phathag/workspace/projects/supabase/apps/ui-library/registry/default/platform/platform-kit-nextjs/`
- Supabase manager composition:
  `components/supabase-manager/` inside that directory
- Supabase Platform Kit docs:
  `/Users/phathag/workspace/projects/supabase/apps/ui-library/content/docs/platform/platform-kit.mdx`
- Constructive dashboard's application-database UI:
  `/Users/phathag/workspace/constructive/dashboard/apps/admin/src/components/user-db/`
- Dashboard application-database hooks:
  `/Users/phathag/workspace/constructive/dashboard/apps/admin/src/lib/gql/hooks/user-db/`
- Dashboard tenant routes:
  `/Users/phathag/workspace/constructive/dashboard/apps/admin/src/app/db/[dbId]/`

In the dashboard, `user-db` and `app/db/[dbId]` are the relevant application
database scope. The `platform` and `schema-builder` paths are operator scope and
must not be imported into Console Kit's tenant trust boundary.

## Prioritized polish backlog

### P0: first successful install and honest diagnostics

1. Add a real deterministic Console Kit showcase to the documentation page.
   It should switch presets and show signed-out, discovering, partial, ready,
   incompatible, and unavailable states without requiring the live fixture.
2. Replace generic unavailable copy with endpoint-specific evidence. Provide a
   retry action where one can work, a copyable diagnostic, and a link to the
   relevant setup guidance. Do not imply that an unavailable public route is a
   backend defect.
3. Publish one compact install matrix covering core, standalone pack, Console
   module, each preset, and the umbrella. Show what each choice installs, what
   public evidence it expects, and how it degrades when that evidence is absent.
4. Reduce the common integration to a tenant descriptor plus feature-module
   list. Keep endpoint resolver and semantic binding overrides available for
   ambiguous custom schemas without making them mandatory boilerplate.
5. Exercise every documented command through the real shadcn CLI in a clean
   consumer. A pretty snippet that does not install is a release blocker.

### P0: current workflow polish

1. Normalize visual hierarchy, spacing, control density, status language, and
   action feedback across all seven packs. Reuse shared resource-state and
   action-state primitives instead of fixing each pack independently.
2. Improve filtered-empty states in Users and Organizations. A resource can be
   populated while a local search or tab has no matches; an empty table body is
   not sufficient feedback.
3. Improve auth ergonomics with password visibility, action-specific pending
   labels, useful requirement feedback, and focus movement to the first form
   error. Keep the provider-neutral action contract intact.
4. Reduce narrow app-bar density. Connection and metadata status currently
   compete for mobile width; one compact status entry point should still expose
   all connection evidence and copy feedback.
5. Make the docs mobile navigation modal-grade. The current custom drawer needs
   focus containment, return focus, and body-scroll containment, or should be
   replaced with the shared Sheet/Sidebar behavior.
6. Break up large workflow components only where the extraction creates a
   reusable visual or interaction contract. Users, Organizations, Storage, and
   `console-kit.tsx` should not become collections of one-off wrappers.

### P1: embedding and navigation, after product confirmation

- Use the existing `AppShell` search slot for command navigation across
  installed features and discovered tables.
- Add controlled/default/callback forms for useful Users, Organizations, and
  Notifications filters so hosts can synchronize them with URLs.
- Add a dialog/drawer Console Kit composition for embedded management flows.
- Add host slots for database and environment selection using the same atomic
  tenant reset already used by Console Kit.
- Add richer Storage breadcrumbs and provider escape hatches only when the
  public endpoint supports them.

### Decision-gated, not part of a general polish pass

Operator-only auth policy, logs, secrets, security diagnostics, a SQL
workspace, or AI-generated queries require a separately permissioned adapter
and explicit operator authority. Do not smuggle these into the tenant session
because Platform Kit happens to expose similar screens.

## Current strengths to preserve

- All packs expose explicit loading, empty, error, and ready resource states.
- Destructive operations already require confirmation.
- Forms expose pending and failure states, and timestamps use explicit locale
  formatting.
- Narrow table views provide horizontal-scroll guidance.
- The shell supports responsive Base UI sidebar behavior, breadcrumbs,
  host-rendered links, account actions, dark mode, and reduced motion.
- The connection view is mobile-safe and provides accessible copy feedback.
- Auth credentials stay in the database-scoped session closure/storage, never
  in Zustand.
- Tenant and identity changes clear scoped caches and block stale module
  closures from reading or writing the new scope.
- `config.order` affects visible modules and subscriptions without losing the
  installed module slices needed if a host reveals a pack later.

## Known backend-surface limits

These are expected degraded states, not frontend bugs to hide:

- Stock `b2b:storage` and `full` install Storage UI, but their default public
  APIs do not route storage tables. Show an actionable unavailable state.
- The custom `storage-routed` fixture maps Storage to the supported `admin` API
  and proves `_meta` and reads. It exposes table CRUD roots, but no
  object-upload or presigned-URL workflow, so write controls must remain
  hidden.
- Stock Notifications has no reachable public inbox domain, so it remains
  unavailable even when the backend module is installed.
- The native membership fixture uses `auto-approved-and-verified` to isolate
  session and RLS behavior from mail delivery. It does not prove the email
  verification workflow.
- Browser E2E proves authentication, persisted-session restoration, Data
  navigation, Users, Organizations, and routed read-only Storage. Separate
  public GraphQL helpers prove CRUD and anonymous, peer, cross-tenant, invalid,
  and revoked-token denial. Do not describe that CRUD proof as browser-driven.

## Live `_meta` audit

The 2026-07-24 local audit queried all 32 retained tenant endpoint URLs plus
the platform Agent and Compute APIs. Every healthy route exposes the same
`Query._meta: MetaSchema` signature with 26 `Meta*` object types, and
`packages/data/src/meta-query.ts` requests every live field. Current tenant
values prove application scope, tsvector search, storage tags, enums, and UUID,
datetime, inet, bytea, bigint, and interval encodings. Platform routes also
prove vector, composite, and date encodings. The retained fixtures do not yet
exercise non-null i18n or realtime metadata.

The response values also establish a critical boundary for follow-up work:
`_meta` can describe hidden partition tables and can publish naive operation
inflections such as `principalentitys` when introspection exposes
`principalEntities`. Standard introspection must filter the executable table
surface and bind exact read/write coordinates; it must never infer a single-row
operation such as `currentUser` by return type alone. The current retained Data
and routed Storage roots resolve, and Storage relation targets now resolve
through `_meta.inflection` aliases. A future operation-binding pass should make
the same reconciliation explicit for arbitrary tenant table names.

Seven retained empty-schema routes currently return HTTP 500 even for a minimal
query: `b2b-storage` agent/compute/config/objects and `storage-routed`
agent/compute/config. Equivalent empty routes in the full profile return
`tables: []`, so Console Kit must continue to isolate endpoint errors instead
of treating one failed route as evidence about another capability.

## Native proof environment

The retained exact-ID journal is ignored at:

`/Users/phathag/workspace/constructive/blocks-feature-packs/.local/console-kit-native-fixture.json`

It owns four native tenant databases: the three official profiles and one
supported custom `storage-routed` profile. Do not clean it while it is being
used for visual review.

If the backend runtime is no longer running:

```bash
cd /Users/phathag/workspace/constructive/constructive-db/functions
fun up --local --db consolekitblocks
```

Start Blocks with the live integration route enabled:

```bash
cd /Users/phathag/workspace/constructive/blocks-feature-packs
CONSOLE_KIT_INTEGRATION=1 \
CONSOLE_KIT_TENANT_MANIFEST=/Users/phathag/workspace/constructive/blocks-feature-packs/.local/console-kit-native-fixture.json \
pnpm --filter blocks dev
```

Run the live proof:

```bash
CONSOLE_KIT_BASE_URL=http://localhost:3005/__integration/console-kit \
CONSOLE_KIT_TENANT_MANIFEST=/Users/phathag/workspace/constructive/blocks-feature-packs/.local/console-kit-native-fixture.json \
pnpm --filter blocks test:e2e:live
```

Fixture implementation and cleanup safeguards are in
`apps/blocks/e2e-live/` and
`apps/blocks/scripts/console-kit-native-fixture.ts`. Cleanup inventories and
drops only exact journaled database namespaces. Run it only when intentionally
ending the retained proof environment:

```bash
pnpm fixture:console-kit cleanup \
  --database consolekitblocks \
  --manifest /Users/phathag/workspace/constructive/blocks-feature-packs/.local/console-kit-native-fixture.json
```

## Verification workflow

Use Node 24 LTS and pnpm 10.28.0. Prefer small conventional commits so visual,
DX, and contract changes can be reviewed independently.

Stop the Blocks development server before a production Next.js build or a
registry smoke install. Those commands rewrite `.next` or package `dist`
directories and can create misleading transient Fast Refresh errors in a live
development process. Restart the development server afterward for visual QA.

For a normal UI iteration:

```bash
pnpm --filter blocks gen:check
pnpm --filter blocks lint:types
pnpm --filter blocks test
pnpm --filter blocks build
```

For registry or install-surface changes:

```bash
pnpm --filter @constructive-io/registry test
pnpm --filter @constructive-io/registry build
SMOKE_CASE=console-kit-nextjs,console-module-storage \
  pnpm --filter @constructive-io/registry smoke:install
pnpm check:public
pnpm check:registry-contract
```

Before final handoff or release:

```bash
pnpm check
pnpm check:full
pnpm build:pages
```

At the implementation baseline, these gates passed:

- Blocks: 246 tests
- Native fixture safety: 16 tests
- Data: 256 tests
- Sheets: 633 tests
- Registry compiler: 15 tests
- Live native tenant/RLS suite: 8 tests
- Next.js production build: 71 routes
- Clean package-backed shadcn install and Tailwind compilation
- Independent architecture and security adversarial reviews

Counts can legitimately change; the important condition is that the full
relevant gate stays green.

### Visual verification

Use browser automation for presentation rather than multiplying snapshot-like
unit tests. At minimum inspect:

- 1440 px desktop
- 1024 px compact desktop/tablet
- 390 px mobile
- 320 px narrow mobile
- light and dark themes
- keyboard navigation and visible focus
- reduced motion
- dialogs, popovers, sidebar/drawer, filtered-empty, destructive confirmation,
  loading, partial, unavailable, and error states

There must be no page-level horizontal overflow. Popovers and dialogs must fit
the narrow viewport, return focus correctly, and announce actionable errors.

The user explicitly does not want a large number of unit tests for static
visual documentation components. Add tests for state transitions, contracts,
accessibility behavior, destructive actions, and regression-prone interaction;
use browser review for spacing, typography, composition, and responsive polish.

## Harness follow-up, after Blocks settles

The app-building harness is in
`/Users/phathag/workspace/constructive/constructive-skills/.agents/skills/constructive-builder/`.
It still contains older assumptions about per-flow Blocks, generated SDK
aliases, `BlocksRuntime`, and a previous registry location. Do not mix that
migration into the first UI polish commit.

Once the Blocks install surface and examples are stable, explicitly reconcile:

- `constructive.config.json`
- `references/flow-catalog.md`
- `references/flows.json`
- `references/phase-4-blocks.md`
- `references/blocks-onramp.md`
- `scripts/wire-app.mjs`
- `scripts/check-harness-drift.mjs`
- `scripts/lib/verify-gates.sh`

The target harness model should install a provider-neutral pack, matching
Console module, preset, or umbrella intentionally; pass the provisioned tenant
descriptor; and verify the same capability/degraded-state rules documented
here. Evaluate this only after the Blocks and Console Kit UI/DX wave is accepted.

## Definition of done for the polish wave

- All seven packs and Console Kit read as one product in layout, status
  language, action feedback, responsive behavior, and accessibility.
- The Console Kit page demonstrates the product visually instead of relying on
  code blocks alone.
- A new consumer can choose the right install surface from one matrix and reach
  a working first render without reverse-engineering registry dependencies.
- Missing endpoints, incompatible contracts, and unauthorized operations are
  distinguishable and actionable without overstating backend support.
- Standalone packs still work without Console Kit, and Console modules still
  own all integration code.
- The single modular Zustand store, tenant/identity isolation, explicit
  endpoint model, `_meta` compatibility gate, and RLS authority are unchanged.
- Canonical source, registry output, docs, examples, and clean-install behavior
  agree.
- Relevant unit, package, registry, production, live tenant, visual, and
  adversarial checks pass.
- `constructive-db` remains clean.
