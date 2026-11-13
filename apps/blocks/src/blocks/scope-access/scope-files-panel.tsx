'use client';

import * as React from 'react';

import { normalizeFeaturePackError, type FeaturePackError } from '../feature-packs/shared/feature-pack-contracts';
import { StorageFeaturePack } from '../feature-packs/storage/storage-feature-pack';
import { useScopeRuntime } from './scope-access-provider';
import { loadScopeFiles, type ScopeFilesView } from './scope-files';
import { scopeNames } from './scope-names';
import { loadScopeSchemas } from './scope-runtime';

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
  const [version, setVersion] = React.useState(0);
  const [view, setView] = React.useState<ScopeFilesView>({ resource: { status: 'loading' } });

  React.useEffect(() => {
    const controller = new AbortController();
    const onChange = (key?: string) => {
      setBucketKey(key);
      setVersion((current) => current + 1);
    };
    loadScopeSchemas(runtime, ['data'])
      .then((schemas) => loadScopeFiles(runtime, schemas, { names, entityId }, bucketKey, onChange, controller.signal))
      .then((next) => {
        if (!controller.signal.aborted) setView(next);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setView({
          resource: {
            status: 'error',
            error: normalizeFeaturePackError(error, `The ${names.noun.long} files could not be loaded.`),
            retry: () => setVersion((current) => current + 1)
          }
        });
      });
    return () => controller.abort();
  }, [runtime, names, entityId, bucketKey, version]);

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
