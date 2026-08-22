# @constructive-io/data

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/blocks/actions/workflows/ci.yml">
    <img height="20" src="https://github.com/constructive-io/blocks/actions/workflows/ci.yml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/blocks/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/@constructive-io/data"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/blocks?filename=packages%2Fdata%2Fpackage.json"/></a>
</p>

Runtime query generation and metadata utilities for Constructive/PostGraphile data endpoints.

The package combines Constructive's versioned `_meta` contract with standard GraphQL introspection. `_meta` supplies PostgreSQL encodings, advisory CRUD inflections, relations, constraints, scope, storage, search, i18n, and realtime metadata; standard introspection supplies the exact executable roots, input objects, filters, ordering, pagination, enums, and custom operations.

```ts
import {
  META_CONTRACT_INTROSPECTION_DOCUMENT,
  META_DOCUMENT,
  SCHEMA_INTROSPECTION_QUERY,
  assessSchemaIntrospectionCompatibility,
  assertMetaContract,
  selectConsoleDataTables,
} from '@constructive-io/data';

const signature = await execute(META_CONTRACT_INTROSPECTION_DOCUMENT);
assertMetaContract(signature);

const meta = await execute(META_DOCUMENT);
const schema = await executeSource(SCHEMA_INTROSPECTION_QUERY);
const compatibility = assessSchemaIntrospectionCompatibility(schema, meta);
if (compatibility.status === 'incompatible') {
  throw new Error(`GraphQL schema drift: ${compatibility.missingPaths.join(', ')}`);
}

const tables = selectConsoleDataTables(meta._meta?.tables ?? [], {
  applicationScopes: ['app'],
});
```

`assessSchemaIntrospectionCompatibility` follows the root type names declared by `__schema`, then cross-checks `_meta` operation hints, the arguments required by the query builders, referenced object/input/enum types, table fields, and declared enum values. An incompatible result reports the exact missing GraphQL paths. `_meta` can include hidden tables or naive inflections, so callers must use standard introspection as the authority for any operation they execute.

`selectConsoleDataTables` classifies ownership only from the July `_meta` `table.scope.scope` smart tag, with `app` as the default exact scope. It excludes storage-owned tables and every table identified as a many-to-many junction, regardless of extra domain fields; physical schema names are used only for explicit exclusions and deduplication.
