'use client';

import * as React from 'react';

import type { FeaturePackError } from '../feature-packs/shared/feature-pack-contracts';
import { UsersFeaturePack, type UsersSection } from '../feature-packs/users/users-feature-pack';
import { capitalized, type UsersScopeNoun } from '../feature-packs/users/users-scope-noun';
import { loadScopeAccess } from './scope-access-load';
import { useScopeRuntime } from './scope-access-provider';
import { scopeAccessView } from './scope-access-view';
import { scopeNames } from './scope-names';
import { loadScopeSchemas } from './scope-runtime';
import { useScopeView } from './use-scope-view';

export type ScopeAccessPanelProps = Readonly<{
  /** The membership scope, as `membershipTypes.scope` names it: `app`, `org`, `data_room`. */
  scope: string;
  /** The entity whose members to show; every scope but `app` needs one. */
  entityId?: string;
  title?: string;
  description?: string;
  noun?: UsersScopeNoun;
  section?: UsersSection;
  defaultSection?: UsersSection;
  onSectionChange?: (section: UsersSection) => void;
  onError?: (error: FeaturePackError) => void;
}>;

/**
 * One scope's members, invitations, profiles and capabilities, read and
 * changed as the signed-in user: the App access view on any scope. Every
 * action reloads it; RLS decides what the user sees and may do.
 */
export function ScopeAccessPanel({
  scope,
  entityId,
  title,
  description,
  noun,
  section,
  defaultSection,
  onSectionChange,
  onError
}: ScopeAccessPanelProps) {
  const runtime = useScopeRuntime();
  const names = React.useMemo(() => scopeNames(scope), [scope]);
  const load = React.useCallback(async (signal: AbortSignal, reload: () => void) => {
    const target = { names, entityId };
    const schemas = await loadScopeSchemas(runtime, ['admin', 'auth']);
    const directory = await loadScopeAccess(runtime, schemas, target, signal);
    return scopeAccessView(runtime, schemas, target, directory, reload);
  }, [runtime, names, entityId]);
  const state = useScopeView(load, `The ${names.noun.long} members could not be loaded.`);

  return (
    <UsersFeaturePack
      actions={state.actions}
      defaultSection={defaultSection}
      description={description}
      noun={noun ?? names.noun}
      onError={onError}
      onSectionChange={onSectionChange}
      policy={state.policy}
      resource={state.resource}
      section={section}
      title={title ?? (names.entity ? `${capitalized(names.noun.long)} access` : 'App access')}
    />
  );
}
