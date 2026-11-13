'use client';

import * as React from 'react';
import { flushSync } from 'react-dom';
import { BuildingIcon, CheckIcon, ChevronsUpDownIcon, PlusIcon, UserRoundIcon } from 'lucide-react';

import { Button } from '@constructive-io/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@constructive-io/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@constructive-io/ui/dropdown-menu';
import { Input } from '@constructive-io/ui/input';

import { normalizeFeaturePackError, type FeaturePackError } from '../feature-packs/shared/feature-pack-contracts';
import { useScopeRuntime } from './scope-access-provider';
import { scopeNames } from './scope-names';
import { createOrganization, loadWorkspaces, orderedWorkspaces, type Workspace } from './workspace-load';
import {
  activeWorkspaceId,
  setActiveWorkspace,
  setWorkspaceUser,
  subscribeWorkspace
} from './workspace-store';

type WorkspaceState = Readonly<{
  scope: string;
  workspaces: readonly Workspace[];
  active: Workspace | null;
  canCreate: boolean;
  loading: boolean;
  select: (id: string) => void;
  create: (name: string) => Promise<Workspace>;
  reload: () => void;
}>;

const WorkspaceContext = React.createContext<WorkspaceState | null>(null);

/**
 * Loads the signed-in user's workspaces in a users-table scope (`org` by
 * default) and keeps the active one valid: a choice that is no longer one of
 * them falls back to the personal workspace.
 */
export function WorkspaceProvider({
  scope = 'org',
  children
}: Readonly<{ scope?: string; children: React.ReactNode }>) {
  const runtime = useScopeRuntime();
  const names = React.useMemo(() => scopeNames(scope), [scope]);
  const userId = runtime.session.status === 'authenticated' ? runtime.session.identity.subjectId : null;
  const [loaded, setLoaded] = React.useState<{ workspaces: readonly Workspace[]; canCreate: boolean } | null>(null);
  const [version, setVersion] = React.useState(0);
  const activeId = React.useSyncExternalStore(
    subscribeWorkspace,
    () => activeWorkspaceId(scope),
    () => null
  );

  React.useEffect(() => setWorkspaceUser(userId), [userId]);

  React.useEffect(() => {
    const controller = new AbortController();
    let retry: ReturnType<typeof setTimeout> | undefined;
    const load = (attempt: number) => {
      loadWorkspaces(runtime, names, controller.signal)
        .then((result) => {
          if (!controller.signal.aborted) setLoaded(result);
        })
        .catch(() => {
          // A failed load (an expired session, a slow backend) says nothing
          // about the user's organizations: the list and the choice stay as
          // they are, since the fallback below would reset a choice the list
          // lacks, and a later load decides.
          if (controller.signal.aborted) return;
          retry = setTimeout(() => load(attempt + 1), Math.min(30_000, 2_000 * 2 ** attempt));
        });
    };
    load(0);
    return () => {
      controller.abort();
      clearTimeout(retry);
    };
  }, [runtime, names, userId, version]);

  const workspaces = loaded?.workspaces ?? [];
  const active = workspaces.find((workspace) => workspace.id === activeId) ??
    workspaces.find((workspace) => workspace.personal) ?? null;

  React.useEffect(() => {
    if (active && active.id !== activeId) setActiveWorkspace(scope, active.id);
  }, [active, activeId, scope]);

  const value = React.useMemo<WorkspaceState>(() => ({
    scope,
    workspaces,
    active,
    canCreate: loaded?.canCreate ?? false,
    loading: loaded === null,
    select: (id) => setActiveWorkspace(scope, id),
    create: async (name) => {
      const created = await createOrganization(runtime, names, name);
      // The store renders apart from React state, so the list must hold the
      // organization before it becomes active: the fallback above resets a
      // choice the list doesn't have, and the reload comes later.
      flushSync(() => setLoaded((current) => current && {
        ...current,
        workspaces: orderedWorkspaces([...current.workspaces.filter((w) => w.id !== created.id), created])
      }));
      setActiveWorkspace(scope, created.id);
      setVersion((current) => current + 1);
      return created;
    },
    reload: () => setVersion((current) => current + 1)
  }), [scope, workspaces, active, loaded, runtime, names]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceState {
  const state = React.useContext(WorkspaceContext);
  if (!state) throw new Error('useWorkspace needs a WorkspaceProvider above it.');
  return state;
}

/** The workspace state under a WorkspaceProvider, else null: for parts that work with or without one. */
export function useWorkspaceOrNull(): WorkspaceState | null {
  return React.useContext(WorkspaceContext);
}

/** Picks the active workspace, and starts an organization when the app allows it. */
export function WorkspaceSwitcher({ onError }: Readonly<{ onError?: (error: FeaturePackError) => void }>) {
  const { workspaces, active, canCreate, select, create, loading } = useWorkspace();
  const [creating, setCreating] = React.useState(false);
  const [name, setName] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();

  if (loading || !active) return null;
  const icon = (workspace: Workspace) => (workspace.personal
    ? <UserRoundIcon aria-hidden className='size-4' />
    : <BuildingIcon aria-hidden className='size-4' />);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button className='w-full justify-between' size='sm' variant='outline' />}>
          <span className='flex min-w-0 items-center gap-2'>
            {icon(active)}
            <span className='truncate'>{active.name}</span>
          </span>
          <ChevronsUpDownIcon aria-hidden className='size-4 opacity-60' />
        </DropdownMenuTrigger>
        <DropdownMenuContent align='start'>
          {workspaces.map((workspace) => (
            <DropdownMenuItem key={workspace.id} onClick={() => select(workspace.id)}>
              {icon(workspace)}
              <span className='flex-1 truncate'>{workspace.name}</span>
              {workspace.id === active.id ? <CheckIcon aria-hidden className='size-4' /> : null}
            </DropdownMenuItem>
          ))}
          {canCreate ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setCreating(true)}>
                <PlusIcon aria-hidden className='size-4' />
                New organization
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog onOpenChange={(open) => { setCreating(open); if (!open) setError(undefined); }} open={creating}>
        <DialogContent>
          <form
            className='flex flex-col gap-4'
            onSubmit={async (event) => {
              event.preventDefault();
              setPending(true);
              setError(undefined);
              try {
                await create(name.trim());
                setName('');
                setCreating(false);
              } catch (cause) {
                const normalized = normalizeFeaturePackError(cause, 'The organization could not be created.');
                setError(normalized.message);
                onError?.(normalized);
              } finally {
                setPending(false);
              }
            }}
          >
            <DialogHeader>
              <DialogTitle>New organization</DialogTitle>
              <DialogDescription>Records you add while it is selected belong to it, and its members see them.</DialogDescription>
            </DialogHeader>
            <Input aria-label='Organization name' autoFocus onChange={(event) => setName(event.target.value)} placeholder='Acme Fund' value={name} />
            {error ? <p className='text-sm text-destructive' role='alert'>{error}</p> : null}
            <DialogFooter>
              <Button disabled={pending || !name.trim()} type='submit'>Create organization</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
