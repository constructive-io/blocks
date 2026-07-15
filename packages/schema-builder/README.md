# `@constructive-io/schema-builder`

Framework-agnostic React schema builder for Constructive applications. The host owns the TanStack Query client, authenticated data adapter, scope, color mode, navigation, active tab, and persisted preferences.

```tsx
import { QueryClientProvider } from '@tanstack/react-query';
import {
  DEFAULT_SCHEMA_BUILDER_PREFERENCES,
  SchemaBuilder,
  defineSchemaBuilderAdapter
} from '@constructive-io/schema-builder';
import '@constructive-io/schema-builder/styles.css';

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

Feature-level imports are available from `/core`, `/fields`, `/relationships`, `/indexes`, `/policies`, and `/tables`. A hermetic empty-state adapter for documentation and tests is available from `/testing`.
