import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CardStackProvider, CardStackViewport } from '@constructive-io/ui/stack';
import { Shield } from 'lucide-react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SchemaBuilderProvider } from '../../../../../core/context';
import { createNoopSchemaBuilderAdapter } from '../../../../../testing';
import { DEFAULT_SCHEMA_BUILDER_PREFERENCES } from '../../../../../types';
import { SchemaBuilderDataProvider, type SchemaBuilderDataState } from '../../../../schema-builder-core/lib/gql/hooks/schema-builder/use-schema-builder-selectors';
import type { MergedPolicyType } from '../../../../schema-builder-core/components/policies/policy-types';
import type { CompositePolicyData } from '../../../../schema-builder-core/components/policies/composite-policy-builder/types';
import { CompositePolicyBuilder } from './composite-policy-builder';

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
  Element.prototype.getAnimations ??= () => [];
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const policyTypes: MergedPolicyType[] = [{
  name: 'AuthzDirectOwner', title: 'Direct owner', description: 'Owner access', icon: Shield,
  category: 'needs-fields', hasDataNode: false, generatedFields: [], diagramKey: 'AuthzDirectOwner',
  fieldOverrides: { owner_field: { type: 'string', label: 'Owner field', placeholder: 'Owner field', required: true } },
}];
const leaf = (id: string) => ({ id, type: 'condition' as const, data: { policyType: 'AuthzDirectOwner', data: { owner_field: 'owner_id' } } });
const scope = { orgId: 'org-1', databaseId: 'db-1', userId: 'user-1' };
const hostState: SchemaBuilderDataState = {
  availableSchemas: [], routeOrgId: 'org-1', routeDatabaseId: 'db-1', selectedSchemaKey: '',
  currentSchemaInfo: null, currentSchema: null, currentTable: null, selectedTableId: null,
  hasResolvedDatabaseLookup: true, isLoading: false, isFetching: false, error: null,
  refetch: async () => undefined, selectTable: () => {},
};

describe('composite policy edit integration', () => {
  it('auto-saves an open condition through the current host callback without losing later policy changes', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const adapter = createNoopSchemaBuilderAdapter();
    const initialOnChange = vi.fn();
    const currentOnChange = vi.fn();
    const initialValue: CompositePolicyData = { id: 'policy', type: 'group', operator: 'AND', children: [leaf('first')] };
    const currentValue: CompositePolicyData = { ...initialValue, operator: 'OR', children: [leaf('first'), leaf('second')] };
    const tree = (value: CompositePolicyData, onChange: (value: CompositePolicyData) => void) => (
      <QueryClientProvider client={queryClient}>
        <SchemaBuilderProvider adapter={adapter} scope={scope} colorMode='light' preferences={DEFAULT_SCHEMA_BUILDER_PREFERENCES} onPreferencesChange={() => {}} activeTab='editor' onActiveTabChange={() => {}}>
          <SchemaBuilderDataProvider value={hostState}>
            <CardStackProvider>
              <CompositePolicyBuilder value={value} onChange={onChange} policyTypes={policyTypes} />
              <CardStackViewport />
            </CardStackProvider>
          </SchemaBuilderDataProvider>
        </SchemaBuilderProvider>
      </QueryClientProvider>
    );
    const view = render(tree(initialValue, initialOnChange));
    fireEvent.click(screen.getByRole('button', { name: 'Configure Direct owner condition' }));
    const field = await screen.findByPlaceholderText('Owner field');
    expect((field as HTMLInputElement).value).toBe('owner_id');
    view.rerender(tree(currentValue, currentOnChange));
    fireEvent.change(field, { target: { value: 'account_owner_id' } });
    await waitFor(() => expect(currentOnChange).toHaveBeenCalledWith({
      ...currentValue,
      children: [{ ...leaf('first'), data: { policyType: 'AuthzDirectOwner', data: { owner_field: 'account_owner_id' } } }, leaf('second')],
    }));
    expect(initialOnChange).not.toHaveBeenCalled();
  });
});
