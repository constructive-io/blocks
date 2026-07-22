# @constructive-io/data

Runtime query generation and metadata utilities for Constructive/PostGraphile data endpoints.

The package combines Constructive's versioned `_meta` contract with standard GraphQL introspection. `_meta` supplies PostgreSQL encodings, exact CRUD inflections, relations, constraints, scope, storage, search, i18n, and realtime metadata; standard introspection supplies input objects, filters, ordering, pagination, enums, and custom root operations.

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

`assessSchemaIntrospectionCompatibility` follows the root type names declared by `__schema`, then verifies every `_meta` CRUD operation, the arguments required by the query builders, referenced object/input/enum types, table fields, and declared enum values. An incompatible result reports the exact missing GraphQL paths.

`selectConsoleDataTables` classifies ownership only from the July `_meta` `table.scope.scope` smart tag, with `app` as the default exact scope. It excludes storage-owned tables and every table identified as a many-to-many junction, regardless of extra domain fields; physical schema names are used only for explicit exclusions and deduplication.
