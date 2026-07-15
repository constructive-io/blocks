# schema-builder-relationships

**Type:** `registry:block`
**Status:** `v1 (frontend ready)`
**Namespaces:** `schema-builder` + `modules`

## Purpose

The **Relationships** tab of the schema-builder family: foreign keys between tables, rendered as an interactive relationship diagram, plus the relation-provision and secure-table flows backed by the `modules` SDK.

Exports `RelationshipsView`, rendered by the `schema-builder` shell when the Relationships tab is active.

## Depends on

- `schema-builder-core` — config, selectors, read hooks, diagram substrate.
- `schema-builder-policies` — the secure-relation path reuses the policy config form and table-grant hooks.

## Host setup

Issues foreign-key constraint mutations (plus `createTable` / `createField` for inline target creation) against the `schema-builder` SDK, and `createRelationProvision` / `relationProvisions` against the `modules` SDK. Wire both namespaces or the Relationships tab actions fail. Declared operations live in `schema-builder-relationships.requires.json`.
