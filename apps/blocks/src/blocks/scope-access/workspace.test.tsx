import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ScopeAccessProvider } from './scope-access-provider';
import { useWorkspace, WorkspaceProvider } from './workspace';
import { activeWorkspaceId } from './workspace-store';

type Workspaces = ReturnType<typeof useWorkspace>;

const respond = (data: unknown) => new Response(JSON.stringify({ data }), {
  headers: { 'Content-Type': 'application/json' }
});

// The owner's backend: one organization appears once `createUser` made it,
// and the workspace list reloads only when the test lets it.
function backend() {
  let created = false;
  let releaseReload: () => void = () => {};
  const reloadReleased = new Promise<void>((resolve) => {
    releaseReload = resolve;
  });
  const fetch: typeof globalThis.fetch = async (_input, init) => {
    const { query, operationName } = JSON.parse(String(init?.body)) as { query: string; operationName?: string };
    switch (operationName ?? /^\s*(?:query|mutation)\s+(\w+)/u.exec(query)?.[1]) {
      case 'ConsoleKitCreateWorkspaceOrganization':
        created = true;
        return respond({ createUser: { user: { id: 'org-1' } } });
      case 'ConsoleKitOrgNewOwner':
        return respond({ orgMemberships: { nodes: [{ actorId: 'owner-1', isOwner: true, isActive: true }] } });
      case 'ConsoleKitOrgWorkspaces':
        if (!created) return respond({ orgMemberships: { nodes: [] } });
        await reloadReleased;
        return respond({ orgMemberships: { nodes: [{ entityId: 'org-1', isActive: true }] } });
      case 'ConsoleKitWorkspaceNames':
        return respond({ users: { nodes: created ? [{ id: 'org-1', displayName: 'Acme Ventures' }] : [] } });
      case 'ConsoleKitWorkspaceAppMembership':
        return respond({ appMemberships: { nodes: [{ actorId: 'owner-1', isActive: true, isAdmin: true }] } });
      default:
        return respond({ appCapabilities: { nodes: [] } });
    }
  };
  return { fetch, releaseReload: () => releaseReload() };
}

function renderWorkspaces(fetch: typeof globalThis.fetch) {
  const state: { current?: Workspaces } = {};
  function Active() {
    state.current = useWorkspace();
    return <span data-testid='active'>{state.current.active?.name ?? 'none'}</span>;
  }
  render(
    <ScopeAccessProvider
      host={{ endpoints: { admin: '/admin/graphql', auth: '/auth/graphql' }, userId: 'owner-1', getAccessToken: () => 'token', fetch }}
    >
      <WorkspaceProvider>
        <Active />
      </WorkspaceProvider>
    </ScopeAccessProvider>
  );
  return state;
}

describe('WorkspaceProvider', () => {
  afterEach(() => localStorage.clear());

  it('keeps a new organization active while the workspace list reloads', async () => {
    const owner = backend();
    const workspaces = renderWorkspaces(owner.fetch);
    await waitFor(() => expect(screen.getByTestId('active')).toHaveTextContent('Personal'));

    await act(async () => {
      await workspaces.current!.create('Acme Ventures');
    });

    expect(screen.getByTestId('active')).toHaveTextContent('Acme Ventures');
    expect(activeWorkspaceId('org')).toBe('org-1');

    await act(async () => owner.releaseReload());
    await waitFor(() => expect(workspaces.current!.loading).toBe(false));
    expect(screen.getByTestId('active')).toHaveTextContent('Acme Ventures');
    expect(activeWorkspaceId('org')).toBe('org-1');
  });
});
