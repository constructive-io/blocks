# schema-builder-tables

**Type:** `registry:block`
**Status:** `v1 (frontend ready)`
**Namespaces:** `schema-builder`

## Purpose

The **tables sidebar** of the schema-builder family: the schema/table navigation tree, table metadata, and table create/rename/delete entry points. Shared empty/header states (`NoTableSelectedView`, `TableMetadataSection`) are consumed by the Structure tab.

Exports `SchemaBuilderSidebar`, rendered by the `schema-builder` shell.

## Depends on

- `schema-builder-core` — config, selectors, read hooks.
- `schema-builder-policies` — the sidebar's "new table" action pushes `CreateTableCard` (its write path is policy-aware), so the card lives in the policies block.

## Host setup

Issues `updateTable` / `deleteTable` against the `schema-builder` SDK. Declared operations live in `schema-builder-tables.requires.json`.
