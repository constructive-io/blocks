# Console Kit and Supabase Platform Kit

Supabase Platform Kit is the relevant comparison because it packages an
embeddable project-management UI as a shadcn-compatible install. Its documented
surface includes database, authentication, users, storage, secrets, logs,
suggestions, and optional AI-assisted SQL; provisioning and other platform
operations remain separate concerns. See the official
[Platform Kit documentation](https://supabase.com/ui/docs/platform/platform-kit),
[release overview](https://supabase.com/blog/supabase-ui-platform-kit), and
[Supabase for Platforms guidance](https://supabase.com/docs/guides/integrations/supabase-for-platforms#platform-kit).

Console Kit serves a different trust boundary. It administers one Constructive
application database as the signed-in tenant user, so PostgreSQL grants and RLS
remain authoritative. It does not turn application credentials into an
operator session or infer access from a preset name.

## Current position

The full `console-kit-nextjs` item now matches Platform Kit's one-command entry
point, while `console-kit-core`, the seven `console-module-*` integrations, and
official preset compositions add a smaller install path for applications that
do not need the full surface. Provider-neutral `feature-pack-*` items remain
standalone view installs and do not pull in Console Kit. Every console
composition uses the same responsive App Shell, App Bar, and Sidebar and the
same per-instance Zustand store.

Console Kit discovers each endpoint through `_meta` and GraphQL introspection,
then distinguishes schema readiness from runtime authorization. That produces
more honest empty, unavailable, and forbidden states across Data, Auth, Users,
Organizations, Storage, Billing, and Notifications, but it also exposes more
integration detail than Platform Kit's compact project-reference API.

The connection menu makes the active database and resolved endpoints visible,
and tenant changes reset session, discovery, adapters, and pack slices as one
operation. Stock Constructive presets can therefore mount safely even when a
pack such as Storage or Notifications is installed but not publicly exposed.

## Completed first-success baseline

The Console Kit documentation now names endpoint and capability failures,
supports retry and copyable diagnostics, and publishes the install matrix for
core, standalone packs, Console modules, official presets, and the umbrella.
The common integration is a secret-free tenant descriptor; custom compositions
add only a feature-module list.

Repository agents can run
`pnpm --silent console-kit:inspect --item <registry-root>` to
receive deterministic JSON derived from the compiled registry and canonical
feature-pack manifests. The plan reports the exact transitive registry graph,
npm dependencies, canonical preset profile, alias-aware registry targets with
source provenance, endpoint/capability/`_meta` requirements, degradation
semantics, auth/session safety contract, and verification work without
contacting a tenant or reading component source.

## Prioritized remaining gaps

### P1: large-tenant collection loading

- Add a provider-neutral collection controller for members, invitations,
  organizations, buckets, objects, notifications, and other growing lists.
  First-party adapters should request one deterministic Relay page at a time,
  retain each collection's independent cursor in pack-owned state within a
  modular slice of the existing Console Kit store, and expose loaded count,
  RLS-filtered total count, pending, retry, and load-more state to the
  standalone block.
- Scope page state by database, session identity, active organization or
  bucket, query, filter, and order. Keep opaque cursors and in-flight state out
  of URLs; URLs should contain only semantic routes, filters, sorting, and
  focused record identifiers. A focused record outside the loaded window must
  be fetched by an exact, introspection-proven filter before it can receive an
  action.
- Preserve truthful collection semantics. Search and unread counts must not
  claim to cover unloaded rows, mutations must invalidate or reconcile every
  affected page, and adapters that cannot prove a stable order, filtered
  lookup, or joined read-state contract must remain bounded with an explicit
  limitation instead of silently truncating data.

### P1: embedding and navigation

- Add a dialog/drawer composition for host applications that need an embedded
  manager, while retaining the full-page console for deeper administration.
- Add host slots for database and environment selection, with the same atomic
  reset used by tenant changes, plus an external-admin escape hatch for work
  that belongs outside the application trust boundary.
- Add command search across installed features and discovered tables, then add
  nested Storage breadcrumbs and provider escape hatches where the public
  endpoint supports them.

### P2: operator-only extensions

- Add separately permissioned adapters for auth policy, log viewing, secret
  metadata, and security or performance diagnostics. These must use explicit
  operator authority rather than the tenant bearer session.
- Add an audited read-only query workspace before considering mutation mode.
  AI query generation and charts should wait for the same permission, audit,
  and result-retention contract.

The next Console Kit release should prioritize embedded compositions, host
selection slots, and command search. Those improve navigation and embedding
without expanding the tenant console into a control-plane product.
