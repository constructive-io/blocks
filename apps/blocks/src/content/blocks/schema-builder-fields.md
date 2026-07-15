# schema-builder-fields

**Type:** `registry:block`
**Status:** `v1 (frontend ready)`
**Namespaces:** `schema-builder`

## Purpose

The **Structure** tab of the schema-builder family: the table editor. Add, edit, and remove columns — types, defaults, nullability — plus primary-key and unique constraints (both are field-level properties here).

Exports `TableEditor`, rendered by the `schema-builder` shell when the Structure tab is active.

## Depends on

- `schema-builder-core` — config, selectors, read hooks.
- `schema-builder-tables` — reuses `NoTableSelectedView` and `TableMetadataSection` for the empty/header states.

## Host setup

Issues `createField` / `updateField` / `deleteField` and the primary-key / unique constraint mutations against the `schema-builder` SDK. Declared operations live in `schema-builder-fields.requires.json`.
