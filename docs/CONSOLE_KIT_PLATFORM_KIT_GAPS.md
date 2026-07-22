# Console Kit and Supabase Platform Kit

This comparison keeps the scope to Supabase Platform Kit rather than treating
the whole Supabase Studio product as a parity target. Platform Kit covers
database browsing, auth configuration, users, storage, secrets, logs,
suggestions, and optional AI-assisted SQL; project provisioning, branching,
restores, and Edge Functions are separate platform concerns.

The reference points are the current
[Platform Kit documentation](https://supabase.com/ui/docs/platform/platform-kit),
the [Supabase for Platforms guidance](https://supabase.com/docs/guides/integrations/supabase-for-platforms#platform-kit),
and the checked-out implementation under
`apps/ui-library/registry/default/platform/platform-kit-nextjs` in the local
Supabase checkout.

## Product position

Console Kit has a broader application-administration model: its feature packs
cover organizations, memberships, provider-neutral billing, notifications,
and storage contracts. The first-party optional adapters remain
capability-gated, so the stock backend's unrouted notification schema and
storage table-routing gap appear as unavailable or partial instead of being
presented as working operations. Supabase's Platform Kit storage view also
leaves object browsing unfinished. Console Kit keeps endpoint kinds and
identity-scoped token resolution explicit, which prevents an admin request
from silently falling back to an application-data boundary.

Platform Kit still has the more compact first-run experience. Console Kit now
ships the equivalent vertical slice as one registry item, but its broader
capability surface means diagnostics and backend-route explanations carry more
of the setup burden.

## Delivered release contract

- `console-kit-nextjs` installs the first-party wrapper, modular Zustand store,
  capability discovery, GraphQL utilities, and every advertised adapter. The
  registry smoke test installs and compiles that exact surface in a clean app.
- The three-preset tenant matrix proves auth transitions, persisted-session
  hydration, tenant remount isolation, `_meta` compatibility, capability
  gating, RLS-safe CRUD, composite keys, and expected unavailable features.
- The quick start leads with
  `<ConstructiveConsoleKit database={tenant} />`; embedded sessions and custom
  adapters stay in the advanced path.

## Prioritized remaining gaps

### P0: product and UX

- Turn `Setup` and `Partial` states into diagnostics that name the missing
  endpoint, capability, GraphQL coordinate, or adapter and offer retry, docs,
  and copyable configuration.
- Add separately permissioned operator adapters for auth policy, logs, secret
  metadata, and security/performance diagnostics. These are different trust
  boundaries from personal account security and application membership.
- Add a compact dialog/drawer composition for debugging inside a host app while
  retaining the full-page application console.
- Add database/environment selector slots, connection status, copy-ID, and an
  external-admin escape hatch while preserving a full session and cache reset
  on tenant changes.
- If backend operators are in scope, add an audited, read-only query workspace
  first. Mutation mode needs an explicit dangerous-operation capability.

### P1: optional polish

- Add natural-language query generation and result charts only after query
  permission and audit policy are defined.
- Add auth-user trend summaries without replacing the richer membership views.
- Add nested object breadcrumbs, command search across features and tables, and
  provider escape hatches.

The next release should prioritize actionable setup diagnostics and a compact
embedded composition; both improve the first successful integration without
expanding Console Kit into an operator console.
