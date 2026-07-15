# Pruned generated SDK fixtures

This directory contains only the generated SDK modules reachable from the
Blocks documentation app. It is deliberately committed so CI and static Pages
builds do not require live GraphQL endpoints.

To refresh after a backend contract or block import changes:

1. Regenerate the dashboard-compatible `auth-sdk`, `admin-sdk`,
   `schema-builder-sdk`, and `modules-sdk` directories from the intended real
   endpoints using `@constructive-io/graphql-codegen`.
2. Run:

   ```bash
   BLOCKS_SDK_SOURCE_ROOT=/absolute/path/to/generated/graphql \
     pnpm --filter blocks fixtures:refresh
   ```

   The source root must contain `<namespace>-sdk/api` for all four namespaces.
3. Run `pnpm --filter blocks fixtures:check`, typecheck, tests, and the Pages
   build, then review every changed generated file before committing it.

Never edit fixture modules by hand. `fixture-manifest.json` records the exact
imports and reachable files so new generated API surface cannot enter silently.

The refresh also reads every `*.requires.json` in `apps/blocks` and
`packages/schema-builder`. Query and mutation names are mapped to their
generated `use<Name>Query` / `use<Name>Mutation` exports. Legacy lowercase or
plural model labels are normalized to exported singular PascalCase types (for
example, `identityProviders` becomes `IdentityProvider` and `orgInvites`
becomes `OrgInvite`).

Backend-pending declarations that do not exist in a generated SDK are listed,
with reasons, in `scripts/sdk-fixture-known-missing.json`. Checks fail if a new
gap appears, if a ledger entry loses its sidecar declaration, or if a formerly
missing export ships and makes its exception stale. Do not remove pending
requirements or add handwritten generated stubs to make the check pass.
