'use client';

import * as React from 'react';

import type { FeaturePackError } from '../feature-packs/shared/feature-pack-contracts';
import { StorageFeaturePack } from '../feature-packs/storage/storage-feature-pack';
import { useScopeRuntime } from './scope-access-provider';
import { loadScopeFiles } from './scope-files';
import { scopeNames } from './scope-names';
import { loadScopeSchemas } from './scope-runtime';
import { useScopeView } from './use-scope-view';

export type ScopeFilesPanelProps = Readonly<{
  /** The membership scope that owns the files: `org`, `data_room`, … */
  scope: string;
  /** The entity whose buckets to show; every scope but `app` needs one. */
  entityId?: string;
  onError?: (error: FeaturePackError) => void;
  className?: string;
}>;

/**
 * An entity's files (a data room's documents, an organization's attachments)
 * with upload, download and delete as the signed-in user. The backend's
 * capabilities and RLS decide which files show and which actions succeed.
 */
export function ScopeFilesPanel({ scope, entityId, onError, className }: ScopeFilesPanelProps) {
  const runtime = useScopeRuntime();
  const names = React.useMemo(() => scopeNames(scope), [scope]);
  const [bucketKey, setBucketKey] = React.useState<string | undefined>();
  const load = React.useCallback(async (signal: AbortSignal, reload: () => void) => {
    // A write opens the bucket it touched and reads it again.
    const onChange = (key?: string) => {
      setBucketKey(key);
      reload();
    };
    const schemas = await loadScopeSchemas(runtime, ['data']);
    return loadScopeFiles(runtime, schemas, { names, entityId }, bucketKey, onChange, signal);
  }, [runtime, names, entityId, bucketKey]);
  const view = useScopeView(load, `The ${names.noun.long} files could not be loaded.`);

  return (
    <StorageFeaturePack
      actions={view.actions}
      className={className}
      onError={onError}
      policy={view.policy}
      resource={view.resource}
    />
  );
}
