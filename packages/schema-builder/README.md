# Schema Builder

Framework-agnostic React schema builder for Constructive applications. The host owns the TanStack Query client, authenticated data adapter, scope, color mode, navigation, active tab, and persisted preferences.

Configure the `@constructive` registry in `components.json`, then install the
source-owned editor:

```bash
pnpm dlx shadcn@4.13.1 add @constructive/schema-builder
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
