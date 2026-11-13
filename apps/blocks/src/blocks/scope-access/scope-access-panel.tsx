'use client';

import * as React from 'react';

import { normalizeFeaturePackError, type FeaturePackError } from '../feature-packs/shared/feature-pack-contracts';
import {
  UsersFeaturePack,
  type UsersFeaturePackProps,
  type UsersScopeNoun,
  type UsersSection
} from '../feature-packs/users/users-feature-pack';
import { loadScopeAccess } from './scope-access-load';
import { useScopeRuntime } from './scope-access-provider';
import { scopeAccessView, type ScopeAccessView } from './scope-access-view';
import { scopeNames } from './scope-names';
import { loadScopeSchemas } from './scope-runtime';

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

type PanelState = Pick<UsersFeaturePackProps, 'resource' | 'policy' | 'actions'>;

const capitalized = (text: string) => text[0]!.toUpperCase() + text.slice(1);

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
  const [version, setVersion] = React.useState(0);
  const [state, setState] = React.useState<PanelState>({ resource: { status: 'loading' } });

  React.useEffect(() => {
    const controller = new AbortController();
    const target = { names, entityId };
    const reload = () => setVersion((current) => current + 1);
    loadScopeSchemas(runtime, ['admin', 'auth'])
      .then(async (schemas): Promise<ScopeAccessView> => {
        const directory = await loadScopeAccess(runtime, schemas, target, controller.signal);
        return scopeAccessView(runtime, schemas, target, directory, reload);
      })
      .then((view) => {
        if (!controller.signal.aborted) setState(view);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          resource: {
            status: 'error',
            error: normalizeFeaturePackError(error, `The ${names.noun.long} members could not be loaded.`),
            retry: reload
          }
        });
      });
    return () => controller.abort();
  }, [runtime, names, entityId, version]);

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
