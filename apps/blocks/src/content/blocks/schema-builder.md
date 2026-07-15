# schema-builder

**Type:** `registry:block`
**Status:** `v1 (frontend ready)`
**Namespaces:** `schema-builder` + `modules` + `auth` + `admin`
**Source:** extracted from `apps/admin` schema builder route (`components/schemas` + `components/table-editor`).

**Pairing:** Self-contained block — mounts its own card-stack navigation. Drop it into any container that gives it height; no surrounding page block required.

## Purpose

The composer **shell** for the schema-builder family. It wires the shared core library and the four area blocks into a single copy-in Postgres schema editor scoped to one database, with four tabs:

- **Structure** (`schema-builder-fields`) — tables and their fields (columns, types, defaults, nullability, primary-key/unique constraints).
- **Relationships** (`schema-builder-relationships`) — foreign keys plus the relation-provision flow backed by the `modules` SDK.
- **Indexes** (`schema-builder-indexes`) — index management.
- **Policies** (`schema-builder-policies`) — row-level security policies, table grants, and create-table-with-policies.

Plus the tables sidebar (`schema-builder-tables`) and the core foundation (`schema-builder-core`). Installing this block pulls all six in as registry dependencies.

The schema visualizer and form-builder tabs from the admin app are intentionally **not** included — this is the core editor only.

## Architecture

The family is split into seven registry items so consumers can install the whole editor (this shell) or compose a subset. Dependency direction is acyclic:

- `schema-builder-core` — leaf; everything depends on it.
- `schema-builder-policies` → core.
- `schema-builder-tables` → core, policies.
- `schema-builder-fields` → core, tables.
- `schema-builder-relationships` → core, policies.
- `schema-builder-indexes` → core.
- `schema-builder` (this shell) → all of the above.

The shell itself is thin: `ClientOnly`, the tab header, the `SchemasRoute` composition, and the public `SchemaBuilder` entry. It imports no generated SDK hooks directly — those live in the area blocks.

## When to use

- Embedding a database schema editor inside your own admin surface without re-implementing the table/field/constraint UI.
- Not a fit when: you only need to read schema metadata (query the SDK directly) or want the visual ER diagram (not shipped here).

## Configuration

The block reads its context from props rather than the router or a global auth store:

```ts
export type SchemaBuilderProps = {
  /** Target database id. Drives all schema loading. Required. */
  databaseId: string;
  /** Owning org id, used for accessible-database scoping. Required. */
  orgId: string;
  /** Optional viewer user id for database ownership checks. */
  userId?: string;
};
```

```tsx
import { SchemaBuilder } from '@/blocks/schema/schema-builder/schema-builder-block';

<div className="h-dvh">
  <SchemaBuilder databaseId={databaseId} orgId={orgId} />
</div>
```

## Host setup

1. Mount `blocks-runtime` once at your app root with all four namespaces this block uses:

   ```tsx
   <BlocksRuntime
     namespaces={['schema-builder', 'modules', 'auth', 'admin']}
     getToken={() => tokenManager.getAccessToken()}
   >
     {children}
   </BlocksRuntime>
   ```

2. Set the endpoints:
   - `NEXT_PUBLIC_SCHEMA_BUILDER_GRAPHQL_ENDPOINT`
   - `NEXT_PUBLIC_MODULES_GRAPHQL_ENDPOINT`
   - `NEXT_PUBLIC_AUTH_GRAPHQL_ENDPOINT` — owner display-name lookups on the database list.
   - `NEXT_PUBLIC_ADMIN_GRAPHQL_ENDPOINT` — app/org permission catalog used by the Policies tab.

3. Generate the SDKs the area blocks import from: `@/generated/schema-builder`, `@/generated/modules`, `@/generated/auth` and `@/generated/admin`. The blocks never ship these types — they bind to the host's generated hooks. Each block's expected operations are declared in its `*.requires.json` for the SDK-check tool.

The block mounts **no** `QueryClient` and **no** auth provider of its own — `blocks-runtime` owns both. Auth failures surface as an inline banner; the block clears cached queries rather than redirecting.

## Registry dependencies

- `schema-builder-core`, `schema-builder-fields`, `schema-builder-relationships`, `schema-builder-indexes`, `schema-builder-policies`, `schema-builder-tables` — the family.
- `blocks-runtime` (the single wiring point — `QueryClientProvider` + per-namespace `configure()`).
- `cn` (class-name util).

## State

- Internal UI state (selected table, active tab, card-stack) lives in a block-local Zustand store and React context (both in `schema-builder-core`) — there is no dependency on the host's global app store.
- Schema data is always loaded in full for the configured `databaseId` (no lightweight/lazy variant).

## Notes / gotchas

- The block expects a container with a defined height; it fills `h-full`.
- The card-stack viewport renders through a portal and is mounted client-only.
- Relationship provisioning issues mutations against the `modules` SDK (`createRelationProvision`, `createSecureTableProvision`); ensure that namespace is wired or the Relationships tab actions will fail.
