import { createNoopSchemaBuilderAdapter } from '../testing';
import type { SchemaBuilderAdapter } from '../types';

const noop = createNoopSchemaBuilderAdapter();

// Generated SDK fetchers return operation-name envelopes. Keeping adapter
// results opaque lets hosts forward those fetchers without unsafe casts.
const generatedSdkAdapter = {
  ...noop,
  core: {
    ...noop.core,
    fields: async () => ({ fields: { nodes: [] } }),
    foreignKeyConstraints: async () => ({ foreignKeyConstraints: { nodes: [] } }),
    indices: async () => ({ indices: { nodes: [] } }),
    policies: async () => ({ policies: { nodes: [] } }),
    schemas: async () => ({ schemas: { nodes: [] } }),
    table: async () => ({ table: null }),
    tables: async () => ({ tables: { nodes: [] } })
  },
  policies: {
    ...noop.policies,
    fields: async () => ({ fields: { nodes: [] } }),
    tables: async () => ({ tables: { nodes: [] } })
  }
} satisfies SchemaBuilderAdapter;

void generatedSdkAdapter;
