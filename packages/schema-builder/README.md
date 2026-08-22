# Schema Builder

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/blocks/actions/workflows/ci.yml">
    <img height="20" src="https://github.com/constructive-io/blocks/actions/workflows/ci.yml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/blocks/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/@constructive-io/schema-builder"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/blocks?filename=packages%2Fschema-builder%2Fpackage.json"/></a>
</p>

Framework-agnostic React schema builder for Constructive applications. The host owns the TanStack Query client, authenticated data adapter, scope, color mode, navigation, active tab, and persisted preferences.

Configure the `@constructive` registry in `components.json`, then install the
source-owned editor:

```bash
pnpm dlx shadcn@latest add @constructive/schema-builder
```

```tsx
import { QueryClientProvider } from '@tanstack/react-query';
import {
  DEFAULT_SCHEMA_BUILDER_PREFERENCES,
  SchemaBuilder,
  defineSchemaBuilderAdapter
} from '@/components/schema-builder';

const adapter = defineSchemaBuilderAdapter({
  // Implement the typed core/fields/relationships/indexes/policies/tables ports.
});

<QueryClientProvider client={queryClient}>
  <SchemaBuilder
    adapter={adapter}
    scope={{ orgId, databaseId, userId }}
    colorMode='light'
    preferences={preferences}
    onPreferencesChange={setPreferences}
    activeTab={activeTab}
    onActiveTabChange={setActiveTab}
    selectedTableId={selectedTableId}
    onSelectedTableChange={({ tableId, tableName }) => selectTable(tableId, tableName)}
  />
</QueryClientProvider>;
```

The installed root exports the full adapter, store, and editor surface. The
host adapter keeps generated SDKs, endpoints, authenticated operations, and
cache invalidation in the consuming application.
