# schema-builder-policies

**Type:** `registry:block`
**Status:** `v1 (frontend ready)`
**Namespaces:** `schema-builder` + `modules` + `admin`

## Purpose

The **Policies** tab of the schema-builder family: row-level security policy editing with a policy diagram, table grants, and the combined create-table-with-policies flow.

Because the create-table write path is the policy-aware `useCreateTableWithPolicies` mutation, this block owns `CreateTableCard` — the `schema-builder-tables` sidebar pushes the card from here rather than duplicating the policy state.

Exports `PoliciesView` (Policies tab) and `CreateTableCard` (consumed by the tables sidebar).

## Depends on

- `schema-builder-core` — config, selectors, read hooks, diagram substrate.

## Host setup

Issues `updatePolicy` / `deletePolicy`, `createTable`, `createTableGrant`, and `createField` against the `schema-builder` SDK; `createSecureTableProvision` against the `modules` SDK; and reads the `appPermissions` / `orgPermissions` catalog from the `admin` SDK. Declared operations live in `schema-builder-policies.requires.json`.
