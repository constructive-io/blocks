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

## Prioritized remaining gaps

### P0: first successful install

- For unreachable endpoints, unexposed contracts, and forbidden operations,
  name the affected endpoint and missing GraphQL or `_meta` evidence, then offer a
  retry, a copyable diagnostic, and the relevant setup documentation.
- Publish a compact install matrix for core-only, each individual pack, all
  three preset compositions, and the full umbrella. Each row should show the
  files installed, public capabilities required, and the expected degraded
  state when a capability is unavailable.
- Reduce the common integration to a tenant descriptor plus a feature-module
  list. Explicit endpoint and semantic binding overrides should remain nearby
  for ambiguous custom schemas without becoming mandatory boilerplate.

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

The next Console Kit release should prioritize actionable capability
diagnostics and the install matrix. Those close the largest DX gap without
expanding the tenant console into a control-plane product.
