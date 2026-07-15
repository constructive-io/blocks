# schema-builder-indexes

**Type:** `registry:block`
**Status:** `v1 (frontend ready)`
**Namespaces:** `schema-builder`

## Purpose

The **Indexes** tab of the schema-builder family: create, edit, and drop a table's indexes, with an index diagram for the selected table.

Exports `IndexesView`, rendered by the `schema-builder` shell when the Indexes tab is active.

## Depends on

- `schema-builder-core` — config, selectors, read hooks.

## Host setup

Issues `createIndex` / `updateIndex` / `deleteIndex` against the `schema-builder` SDK. Declared operations live in `schema-builder-indexes.requires.json`.
