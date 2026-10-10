import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CardStackProvider, CardStackViewport } from '@constructive-io/ui/stack';
import { Toaster } from '@constructive-io/ui/sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SchemaBuilderProvider } from '../core/context';
import { PoliciesView } from '../policies';
import { createNoopSchemaBuilderAdapter } from '../testing';
import { DEFAULT_SCHEMA_BUILDER_PREFERENCES, type SchemaBuilderAdapter } from '../types';
import { SchemaBuilderDataProvider, type SchemaBuilderDataState } from '../schema/schema-builder-core/lib/gql/hooks/schema-builder/use-schema-builder-selectors';

const scope = { orgId: 'org-team', databaseId: 'db-team', userId: 'user-editor' };
const table = { id: 'table-posts', name: 'posts', fields: [], category: 'APP' as const };
const schema = { id: 'schema-app', name: 'app', version: '1', tables: [table] };
const schemaInfo = {
  key: 'db-team', name: 'Team', description: '', category: 'database', nodeCount: 1, edgeCount: 0,
  source: 'database' as const, schema: { name: 'app', description: '', category: 'APP', nodes: [], edges: [] },
  dbSchema: schema, databaseInfo: { id: 'db-team', name: 'Team', schemaId: 'schema-app', tableCount: 1, fieldCount: 0 },
};
const hostState: SchemaBuilderDataState = {
  availableSchemas: [schemaInfo], routeOrgId: 'org-team', routeDatabaseId: 'db-team',
  selectedSchemaKey: 'db-team', currentSchemaInfo: schemaInfo, currentSchema: schema,
  currentTable: table, selectedTableId: 'table-posts', hasResolvedDatabaseLookup: true,
  isLoading: false, isFetching: false, error: null, refetch: async () => undefined, selectTable: () => {},
};
const ownerPolicy = {
  id: 'policy-owner', tableId: 'table-posts', name: 'owner_read', privilege: 'SELECT',
  policyType: 'AuthzDirectOwner', data: { entity_field: 'owner_id' }, disabled: false,
  permissive: true, granteeName: 'authenticated', createdAt: null, updatedAt: null,
};
const companion = { ...ownerPolicy, id: 'backend-companion', name: 'companion', policyType: 'AuthzNotReadOnly' };
const clients: QueryClient[] = [];

beforeEach(() => {
  vi.stubGlobal('PointerEvent', MouseEvent);
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false, media: query, onchange: null, addListener() {}, removeListener() {},
    addEventListener() {}, removeEventListener() {}, dispatchEvent: () => true,
  }));
  Element.prototype.getAnimations ??= () => [];
  Element.prototype.scrollIntoView ??= () => {};
});
afterEach(() => { cleanup(); clients.splice(0).forEach((client) => client.clear()); vi.unstubAllGlobals(); });

function fixtureAdapter() {
  const adapter = createNoopSchemaBuilderAdapter();
  adapter.core.tables = vi.fn().mockResolvedValue({ tables: { nodes: [{ ...table, schemaId: 'schema-app', useRls: true }] } });
  adapter.core.schemas = vi.fn().mockResolvedValue({ schemas: { nodes: [{ id: 'schema-app', schemaName: 'app' }] } });
  adapter.core.fields = vi.fn().mockResolvedValue({ fields: { nodes: [] } });
  return adapter;
}

function showPolicies(adapter: SchemaBuilderAdapter) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  clients.push(client);
  return render(
    <QueryClientProvider client={client}>
      <SchemaBuilderProvider adapter={adapter} scope={scope} colorMode='light'
        preferences={DEFAULT_SCHEMA_BUILDER_PREFERENCES} onPreferencesChange={() => {}}
        activeTab='security' onActiveTabChange={() => {}}>
        <SchemaBuilderDataProvider value={hostState}>
          <CardStackProvider><PoliciesView /><CardStackViewport /></CardStackProvider>
          <Toaster />
        </SchemaBuilderDataProvider>
      </SchemaBuilderProvider>
    </QueryClientProvider>,
  );
}

function artifact(name: string, requests: unknown) {
  const directory = process.env.BLOCKS_POLICY_TEST_ARTIFACTS;
  if (!directory) return;
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, `${name}.html`), `<!doctype html><html><body>${document.body.innerHTML}</body></html>\n`);
  writeFileSync(join(directory, `${name}.json`), `${JSON.stringify(requests, null, 2)}\n`);
}

function addReadPolicyButton() {
  let group = screen.getByRole('heading', { name: 'Read 1' }).parentElement;
  while (group) {
    const buttons = within(group).queryAllByRole('button', { name: 'Add policy' });
    if (buttons.length === 1) return buttons[0]!;
    group = group.parentElement;
  }
  throw new Error('Read policies have no Add policy control');
}

describe('policy adapter and UI integration', () => {
  it('keeps a refused edit retryable and refreshes saved status and deletion without exposing backend companion policies', async () => {
    const adapter = fixtureAdapter();
    const policies = vi.fn().mockResolvedValue({ policies: { nodes: [ownerPolicy, companion] } });
    adapter.core.policies = policies;
    const update = vi.fn().mockRejectedValueOnce(new Error('Policy write refused')).mockResolvedValue({ updatePolicy: { policy: { id: 'policy-owner' } } });
    const remove = vi.fn().mockResolvedValue({ deletePolicy: { policy: { id: 'policy-owner' } } });
    adapter.policies.updatePolicy = update;
    adapter.policies.deletePolicy = remove;
    showPolicies(adapter);

    const edit = await screen.findByRole('button', { name: 'Edit Direct Ownership' });
    expect(screen.getByText(/1 policy protecting/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Edit.*Not Read/ })).toBeNull();
    fireEvent.click(edit);
    const owner = await screen.findByPlaceholderText('owner_id');
    expect((owner as HTMLInputElement).value).toBe('owner_id');
    fireEvent.change(owner, { target: { value: 'account_owner_id' } });
    fireEvent.click(screen.getByRole('switch'));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Policy write refused')).toBeTruthy();
    expect((owner as HTMLInputElement).value).toBe('account_owner_id');
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('false');
    expect(screen.getByRole('button', { name: 'Save' }).hasAttribute('disabled')).toBe(false);

    policies.mockResolvedValue({ policies: { nodes: [{ ...ownerPolicy, disabled: true, data: { entity_field: 'account_owner_id' } }, companion] } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(update).toHaveBeenCalledTimes(2));
    expect(update.mock.calls[1][0]).toEqual({ id: 'policy-owner', policyPatch: { permissive: true, disabled: true, data: { entity_field: 'account_owner_id' } } });
    expect(update.mock.calls[1][1].scope).toEqual(scope);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit Direct Ownership (disabled)' }));
    expect((await screen.findByPlaceholderText('owner_id') as HTMLInputElement).value).toBe('account_owner_id');
    policies.mockResolvedValue({ policies: { nodes: [companion] } });
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(remove).toHaveBeenCalledTimes(1));
    expect(remove.mock.calls[0][0]).toEqual({ id: 'policy-owner' });
    expect(remove.mock.calls[0][1].scope).toEqual(scope);
    await waitFor(() => expect(screen.queryByRole('button', { name: /Edit Direct Ownership/ })).toBeNull());
    expect(await screen.findByText('No policies for posts')).toBeTruthy();
    artifact('policy-edit-delete', { updates: update.mock.calls, deletes: remove.mock.calls });
  });

  it('provisions only the requested operation with organization permissions and trust levels kept distinct', async () => {
    const adapter = fixtureAdapter();
    const policies = vi.fn().mockResolvedValue({ policies: { nodes: [ownerPolicy] } });
    adapter.core.policies = policies;
    adapter.policies.appCapabilities = vi.fn().mockResolvedValue({ appCapabilities: { nodes: [{ id: 'app', name: 'administer_app', kind: 'permission', bitstr: '1000' }] } });
    adapter.policies.orgCapabilities = vi.fn().mockResolvedValue({ orgCapabilities: { nodes: [
      { id: 'read', name: 'read_reports', kind: 'permission', bitstr: '0010' },
      { id: 'trusted', name: 'verified_member', kind: 'level', bitstr: '0100' },
    ] } });
    const provision = vi.fn().mockResolvedValue({ createSecureTableProvision: { secureTableProvision: { tableId: 'table-posts' } } });
    adapter.policies.createSecureTableProvision = provision;
    showPolicies(adapter);
    await screen.findByRole('button', { name: 'Edit Direct Ownership' });
    fireEvent.click(addReadPolicyButton());
    fireEvent.click(await screen.findByRole('button', { name: 'Select Entity Membership' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Edit entity_id field name' }));
    const fieldName = screen.getByRole('textbox');
    fireEvent.change(fieldName, { target: { value: 'organization_id' } });
    fireEvent.keyDown(fieldName, { key: 'Enter' });
    expect(screen.getByRole('button', { name: 'Edit organization_id field name' })).toBeTruthy();
    const permissionPicker = await screen.findByText('Select membership capabilities');
    fireEvent.click(permissionPicker);
    const readOption = await screen.findByRole('option', { name: /read_reports/ });
    expect(screen.queryByRole('option', { name: /verified_member/ })).toBeNull();
    expect(screen.queryByRole('option', { name: /administer_app/ })).toBeNull();
    fireEvent.click(readOption);
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });
    fireEvent.click(screen.getByText('Select membership levels'));
    const levelOption = await screen.findByRole('option', { name: /verified_member/ });
    expect(screen.queryByRole('option', { name: /read_reports/ })).toBeNull();
    fireEvent.click(levelOption);
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });
    policies.mockResolvedValue({ policies: { nodes: [ownerPolicy, {
      ...ownerPolicy, id: 'policy-member', name: 'member_read', policyType: 'AuthzEntityMembership',
      data: { entity_field: 'organization_id', membership_type: 2, capabilities: ['read_reports'], levels: ['verified_member'] },
    }] } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Policy' }));
    await waitFor(() => expect(provision).toHaveBeenCalledTimes(1));
    expect(provision.mock.calls[0][1].scope).toEqual(scope);
    expect(provision.mock.calls[0][0]).toEqual({
      databaseId: 'db-team', schemaId: 'schema-app', tableId: 'table-posts',
      // Table grants are the baseline; the selected RLS policy gates only reads.
      grants: [{ roles: ['authenticated'], privileges: expect.arrayContaining([['select', '*'], ['insert', '*'], ['update', '*'], ['delete', '*']]) }],
      nodes: [{ $type: 'DataEntityMembership', data: { entity_field_name: 'organization_id' } }],
      policies: [{ $type: 'AuthzEntityMembership', policy_name: expect.any(String), policy_role: 'authenticated', permissive: true, privileges: ['select'],
        data: { entity_field: 'organization_id', membership_type: 2, capabilities: ['read_reports'], levels: ['verified_member'] } }],
    });
    expect(provision.mock.calls[0][0].grants[0].privileges).toHaveLength(4);
    await screen.findByRole('button', { name: 'Edit Entity Membership' });
    expect(screen.getByRole('heading', { name: 'Read 2' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Create 0' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Update 0' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Delete 0' })).toBeTruthy();
    artifact('policy-membership-read', provision.mock.calls);
  });
});
