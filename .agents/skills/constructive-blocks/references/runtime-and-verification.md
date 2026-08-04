# Runtime integration and verification

Use this reference whenever an installed block touches endpoints, sessions,
adapters, tenant data, provider state, or production qualification.

## Preserve host and security boundaries

- Pass database and service endpoints explicitly. Never derive a sibling host
  or route a control-plane request through a tenant-plane endpoint.
- Keep credentials and token lifecycle in the host session contract. Do not put
  secrets in component props, registry metadata, persisted UI state, or source
  control.
- Keep generated GraphQL SDKs and business orchestration in the host. Blocks
  accept typed adapters, resources, sessions, and callbacks.
- Treat `_meta`, introspection, installed manifests, and visible controls as
  capability evidence. They do not prove PostgreSQL grants or RLS authority.
- Exercise allowed and denied operations with the intended tenant role before
  claiming an integration is authorized.

## Inspect provider composition

Read the installed root and every provider it mounts. Use exactly the provider
boundaries and controlled properties documented by the current item.

Do not assume that Console Kit, Sheets, Schema Builder, or standalone feature
packs share a global store. Do not add a second provider solely to satisfy an
old integration example. When composing several roots, verify state isolation,
query-client ownership, portal ownership, and mount/unmount cleanup from the
installed source.

## Verify the consumer

1. Review `git diff` and the shadcn output. Confirm every created target belongs
   under the aliases reported by `shadcn@latest info --json`.
2. Read all added TypeScript, TSX, CSS, and manifest files. Reject
   repository-internal aliases, `workspace:*`, generated-registry paths, or an
   accidental dependency on `@constructive-io/ui` for source-installed UI.
3. Confirm required client boundaries, peer dependencies, global CSS changes,
   theme tokens, portal roots, and provider placement.
4. Run the consumer's formatter or lint check without rewriting unrelated
   files, then run typecheck, focused tests, and the real production build.
5. Render the integrated surface and exercise loading, empty, error, and success
   states. Also exercise unavailable capability and permission-denied states for
   data-backed blocks.
6. Reload after a successful mutation and read the data back independently when
   persistence is part of the claim.

For Console Kit and feature packs, inspect the installed
`.constructive/feature-packs` manifests when present. They describe required
backend evidence; they never grant authority.

## Qualify by surface

- **AI:** Verify streaming updates, stop behavior, tool states, and approval
  callbacks without moving model execution or persistence into the block.
- **Command Palette:** Verify global and page-scoped registration, host routing,
  cancellation, and the split between headless package imports and installed
  presentation imports.
- **Sheets:** Verify metadata loading, row identity, read/write behavior,
  overlays, keyboard use, and both permitted and RLS-denied mutations.
- **Schema Builder:** Verify controlled scope, adapter operations, invalidation,
  destructive confirmation, and control-plane authorization failures.
- **Org Chart and Storage:** Verify controlled callbacks, persistence after
  reload, keyboard alternatives, and distinct empty, unavailable, and denied
  states.
- **Billing:** Verify independent resource failures, exact quantities and dates,
  pending actions, provider errors, and host authorization.
- **Console Kit:** Verify explicit endpoint selection, session/database identity,
  capability discovery, installed-module navigation, isolation across mounts,
  and authenticated reads and writes.

Passing installation and compilation proves the source is consumable. It does
not prove a live backend, tenant routing, persistence, or authorization contract.
