# schema-builder-core

**Type:** `registry:lib`
**Status:** `v1 (frontend ready)`
**Namespaces:** `schema-builder` + `auth`

## Purpose

Shared foundation for the schema-builder block family. Not mounted on its own — the area blocks (`schema-builder-fields`, `-relationships`, `-indexes`, `-policies`, `-tables`) and the `schema-builder` shell all build on it. It ships:

- **Config provider** — `SchemaBuilderConfigProvider` / `useSchemaBuilderConfig`, the prop-driven context (`databaseId`, `orgId`, `userId`) that replaces the host router/auth store.
- **Schema selectors + store** — `useSchemaBuilderSelectors` and the block-local Zustand store (selected schema/table, card-stack state).
- **GraphQL read hooks** — the `fetch*Query` reads for databases, schemas, tables, fields, and constraints.
- **Databases UI + skeletons** — `NoDatabasesEmptyState`, `SchemaBuilderSkeleton`, `ContentFadeIn`, `SchemaStateDisplay`.
- **Diagram substrate** — the shared SVG primitives, icons, and themes used by both the relationship and policy diagrams.

## When to use

- Installed automatically as a registry dependency of every schema-builder area block and the shell. You rarely install it directly; do so only when composing a custom subset of the family.

## Host setup

Reads from the `schema-builder` SDK (schema metadata) and the `auth` SDK (owner display-name lookups on the databases list). Both namespaces must be wired through `blocks-runtime`. Declared operations live in `schema-builder-core.requires.json`.
