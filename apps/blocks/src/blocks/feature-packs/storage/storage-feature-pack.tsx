'use client';

import * as React from 'react';
import { CircleAlertIcon } from 'lucide-react';

import { Alert, AlertDescription } from '@constructive-io/ui/alert';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@constructive-io/ui/alert-dialog';
import { Button } from '@constructive-io/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogTitle
} from '@constructive-io/ui/dialog';
import { Field, FieldLegend, FieldSet } from '@constructive-io/ui/field';
import { Input } from '@constructive-io/ui/input';
import { RadioGroup, RadioGroupItem } from '@constructive-io/ui/radio-group';
import { StorageBrowser } from '@/components/ui/storage/storage-browser';
import type {
  ObjectSort,
  StorageBucket as StorageBrowserBucket,
  StorageObject as StorageBrowserObject
} from '@/components/ui/storage/types';
import { VISIBILITY } from '@/components/ui/storage/visibility-badge';
import { cn } from '@/lib/utils';

import {
  canPerform,
  normalizeFeaturePackError,
  type FeatureActionPolicy,
  type FeatureActionResult,
  type FeaturePackError,
  type FeaturePackResource
} from '../shared/feature-pack-contracts';
import { FeaturePackBoundary, FeaturePackLimitations } from '../shared/feature-pack-ui';

export type StorageBucket = Readonly<{
  id: string;
  key: string;
  name: string;
  access: 'public' | 'private' | string;
  objectCount?: number;
  sizeLabel?: string;
}>;

export type StorageObject = Readonly<{
  id: string;
  key: string;
  name: string;
  kind: 'file' | 'folder';
  contentType?: string;
  sizeLabel?: string;
  updatedAt?: string;
}>;

export type StorageFeatureData = Readonly<{
  buckets: readonly StorageBucket[];
  activeBucketKey?: string;
  path?: string;
  objects: readonly StorageObject[];
}>;

export type StorageFeatureAction =
  | 'selectBucket'
  | 'navigate'
  | 'createBucket'
  | 'upload'
  | 'download'
  | 'deleteObject';

export type StorageFeatureActions = Readonly<{
  selectBucket?: (input: { bucketKey: string }) => FeatureActionResult;
  navigate?: (input: { bucketKey: string; path: string }) => FeatureActionResult;
  createBucket?: (input: { name: string; access: 'public' | 'private' }) => FeatureActionResult;
  upload?: (input: { bucketKey: string; path: string; files: readonly File[] }) => FeatureActionResult;
  download?: (input: { bucketKey: string; objectKey: string }) => FeatureActionResult;
  deleteObject?: (input: { bucketKey: string; objectKey: string }) => FeatureActionResult;
}>;

export type StorageFeaturePackProps = Readonly<{
  resource: FeaturePackResource<StorageFeatureData>;
  policy?: FeatureActionPolicy<StorageFeatureAction>;
  actions?: StorageFeatureActions;
  onError?: (error: FeaturePackError) => void;
  /** Classes for the storage workspace; give it a height. Default: 40rem tall. */
  className?: string;
}>;

/** The pack's buckets in the Storage Browser's shape. */
function toBrowserBucket(bucket: StorageBucket): StorageBrowserBucket {
  const visibility = bucket.access === 'public' ? 'public' : bucket.access === 'temp' ? 'temp' : 'private';
  return {
    id: bucket.id,
    key: bucket.key,
    name: bucket.name,
    visibility,
    isPublic: visibility === 'public',
    allowCustomKeys: false,
    objectCount: bucket.objectCount ?? null
  };
}

/**
 * The pack's objects in the Storage Browser's shape. Keys are relative to the
 * open folder (the crumbs already show where you are) and sizes stay the
 * host's labels; actions map back to the pack object by id.
 */
function toBrowserObject(object: StorageObject, bucket: StorageBucket): StorageBrowserObject {
  return {
    id: object.id,
    bucketId: bucket.id,
    key: object.name,
    filename: object.name,
    mimeType: object.contentType ?? '',
    size: 0,
    sizeLabel: object.sizeLabel ?? (object.kind === 'folder' ? undefined : '—'),
    isPublic: bucket.access === 'public',
    createdAt: object.updatedAt ?? '',
    kind: object.kind
  };
}

const SIZE_UNITS: Record<string, number> = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 };

/** Bytes behind a label such as "2.4 MB", for sorting; unknown labels sort first. */
function labelBytes(label: string | undefined) {
  const match = label?.trim().match(/^([\d.,]+)\s*([KMGT]?B)$/i);
  return match ? Number(match[1]!.replace(/,/g, '')) * (SIZE_UNITS[match[2]!.toUpperCase()] ?? 1) : -1;
}

/** Folders first, then by the chosen column. */
function compareObjects(left: StorageObject, right: StorageObject, sort: ObjectSort) {
  if (left.kind !== right.kind) return left.kind === 'folder' ? -1 : 1;
  let comparison = 0;
  if (sort.column === 'filename') comparison = left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });
  else if (sort.column === 'mimeType') comparison = (left.contentType ?? '').localeCompare(right.contentType ?? '');
  else if (sort.column === 'size') comparison = labelBytes(left.sizeLabel) - labelBytes(right.sizeLabel);
  else comparison = (Date.parse(left.updatedAt ?? '') || 0) - (Date.parse(right.updatedAt ?? '') || 0);
  return sort.direction === 'asc' ? comparison : -comparison;
}

function CreateBucketDialog({
  open,
  onOpenChange,
  onCreate
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: { name: string; access: 'public' | 'private' }) => Promise<boolean>;
}>) {
  const [name, setName] = React.useState('');
  const [access, setAccess] = React.useState<'public' | 'private'>('private');
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const fieldId = React.useId();

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) return;
    setPending(true);
    setError(undefined);
    try {
      const succeeded = await onCreate({ name: name.trim(), access });
      if (succeeded) {
        setName('');
        onOpenChange(false);
      } else {
        setError('The bucket could not be created.');
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (pending) return;
        onOpenChange(nextOpen);
        if (!nextOpen) setError(undefined);
      }}
    >
      <DialogContent className='max-w-md'>
        <form onSubmit={(event) => void submit(event)}>
          <DialogHeader className='gap-1.5 pb-3'>
            <DialogTitle className='text-base font-medium'>Create a storage bucket</DialogTitle>
            <DialogDescription className='text-[13px]'>
              Bucket access sets the default delivery boundary; database policy remains authoritative.
            </DialogDescription>
          </DialogHeader>
          <DialogPanel className='flex flex-col gap-4'>
            <Field error={error} htmlFor={`${fieldId}-name`} label='Bucket name' required>
              <Input
                aria-invalid={error ? true : undefined}
                autoComplete='off'
                id={`${fieldId}-name`}
                name='bucket-name'
                onChange={(event) => setName(event.currentTarget.value)}
                required
                value={name}
              />
            </Field>
            <FieldSet>
              <FieldLegend id={`${fieldId}-access-label`} variant='label'>Access</FieldLegend>
              <RadioGroup
                aria-labelledby={`${fieldId}-access-label`}
                className='grid gap-1.5'
                name='bucket-access'
                onValueChange={(value) => setAccess(value as 'public' | 'private')}
                value={access}
              >
                {(['private', 'public'] as const).map((candidate) => {
                  const { icon: Icon, label, hint } = VISIBILITY[candidate];
                  return (
                    <label
                      className='bg-card flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 shadow-card has-[:checked]:ring-2 has-[:checked]:ring-primary/40'
                      htmlFor={`${fieldId}-access-${candidate}`}
                      key={candidate}
                    >
                      <Icon aria-hidden='true' className='text-muted-foreground size-4 shrink-0' />
                      <span className='flex min-w-0 flex-1 flex-col gap-0.5'>
                        <span className='text-[13px] font-medium'>{label}</span>
                        <span className='text-muted-foreground text-xs'>{hint}</span>
                      </span>
                      <RadioGroupItem id={`${fieldId}-access-${candidate}`} value={candidate} />
                    </label>
                  );
                })}
              </RadioGroup>
            </FieldSet>
          </DialogPanel>
          <DialogFooter>
            <Button disabled={pending || !name.trim()} size='sm' type='submit'>
              {pending ? 'Creating…' : 'Create bucket'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteObjectDialog({
  object,
  onClose,
  onDelete
}: Readonly<{
  object: StorageObject | null;
  onClose: () => void;
  onDelete: (object: StorageObject) => Promise<boolean>;
}>) {
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string>();
  // Keep the name on screen while the dialog animates closed.
  const [shown, setShown] = React.useState(object);
  if (object && object !== shown) setShown(object);
  const target = object ?? shown;

  return (
    <AlertDialog
      onOpenChange={(nextOpen) => {
        if (pending || nextOpen) return;
        setError(undefined);
        onClose();
      }}
      open={Boolean(object)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {target?.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the {target?.kind === 'folder' ? 'folder' : 'object'} from this bucket. This action cannot be undone from the console.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <Alert role='alert' variant='destructive'>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <Button
            disabled={pending || !object}
            onClick={() => {
              if (!object) return;
              setPending(true);
              setError(undefined);
              void onDelete(object)
                .then((succeeded) => {
                  if (succeeded) onClose();
                  else setError('The object could not be deleted. Check your access and try again.');
                })
                .finally(() => setPending(false));
            }}
            variant='destructive'
          >
            {pending ? 'Deleting…' : 'Delete object'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * The storage feature pack: the Storage Browser workspace behind the pack
 * contract. Buckets, folders, uploads (button or drop), downloads, and
 * deletes run through the host's actions and only appear when the policy
 * allows them. Search and sort are local to the open folder.
 */
export function StorageFeaturePack({
  resource,
  policy,
  actions,
  onError,
  className
}: StorageFeaturePackProps) {
  const [pendingAction, setPendingAction] = React.useState<string>();
  const [actionError, setActionError] = React.useState<string>();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<StorageObject | null>(null);
  const [query, setQuery] = React.useState('');
  const [sort, setSort] = React.useState<ObjectSort>({ column: 'filename', direction: 'asc' });
  const pendingActionRef = React.useRef<string | undefined>(undefined);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const run = async (
    key: string,
    action: () => FeatureActionResult,
    fallback: string,
    showInlineError = true
  ): Promise<boolean> => {
    if (pendingActionRef.current) return false;
    pendingActionRef.current = key;
    setPendingAction(key);
    if (showInlineError) setActionError(undefined);
    try {
      await action();
      return true;
    } catch (cause) {
      const normalized = normalizeFeaturePackError(cause, fallback);
      if (showInlineError) setActionError(normalized.message);
      onError?.(normalized);
      return false;
    } finally {
      pendingActionRef.current = undefined;
      setPendingAction(undefined);
    }
  };

  const createBucket = canPerform(policy, 'createBucket') ? actions?.createBucket : undefined;
  const data = resource.status === 'ready' ? resource.data : undefined;
  const activeBucket = data ? data.buckets.find((bucket) => bucket.key === data.activeBucketKey) ?? data.buckets[0] : undefined;
  const path = data?.path ?? '';
  const pathSegments = path.split('/').filter(Boolean);
  const selectBucket = canPerform(policy, 'selectBucket') ? actions?.selectBucket : undefined;
  const navigate = canPerform(policy, 'navigate') && activeBucket ? actions?.navigate : undefined;
  const upload = canPerform(policy, 'upload') && activeBucket ? actions?.upload : undefined;
  const download = canPerform(policy, 'download') && activeBucket ? actions?.download : undefined;
  const deleteObject = canPerform(policy, 'deleteObject') && activeBucket ? actions?.deleteObject : undefined;

  const objects = React.useMemo(() => {
    if (!data || !activeBucket) return [];
    const needle = query.trim().toLowerCase();
    return data.objects
      .filter((object) => !needle || `${object.name} ${object.contentType ?? ''}`.toLowerCase().includes(needle))
      .sort((left, right) => compareObjects(left, right, sort))
      .map((object) => toBrowserObject(object, activeBucket));
  }, [activeBucket, data, query, sort]);
  const objectById = React.useMemo(() => new Map(data?.objects.map((object) => [object.id, object])), [data]);

  const openPath = (target: string, key: string) => {
    if (!navigate || !activeBucket) return;
    setQuery('');
    void run(key, () => navigate({ bucketKey: activeBucket.key, path: target }), 'The folder could not be opened.');
  };
  const uploadFiles = upload && activeBucket
    ? (files: readonly File[]): void => {
      void run('upload', () => upload({ bucketKey: activeBucket.key, path, files }), 'The files could not be uploaded.');
    }
    : undefined;
  const loadingContents = Boolean(pendingAction?.startsWith('bucket-') || pendingAction?.startsWith('navigate-'));

  const notices = (
    <>
      <FeaturePackLimitations limitations={resource.status === 'ready' ? resource.limitations : undefined} />
      {actionError ? (
        <Alert role='alert' variant='destructive'>
          <CircleAlertIcon aria-hidden='true' />
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      ) : null}
    </>
  );

  if (resource.status === 'loading' || resource.status === 'error') {
    return (
      <div className='flex flex-col gap-3'>
        {notices}
        <FeaturePackBoundary emptyDescription='' emptyTitle='' resource={resource}>
          {() => null}
        </FeaturePackBoundary>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-3'>
      {notices}
      <StorageBrowser
        buckets={data ? data.buckets.map(toBrowserBucket) : []}
        bucketsSelectable={Boolean(selectBucket) && !pendingAction}
        busyBucketId={pendingAction?.startsWith('bucket-')
          ? data?.buckets.find((bucket) => `bucket-${bucket.key}` === pendingAction)?.id
          : undefined}
        className={cn('h-[40rem]', className)}
        emptyLabel={query ? `Nothing in this folder matches “${query.trim()}”` : 'This folder is empty'}
        emptyState={!activeBucket
          ? 'no-buckets'
          : data?.objects.length === 0 && !path && !loadingContents
            ? 'empty-bucket'
            : null}
        isLoading={loadingContents}
        isUploading={pendingAction === 'upload'}
        objects={objects}
        onDelete={deleteObject ? (object) => setDeleteTarget(objectById.get(object.id) ?? null) : undefined}
        onDownload={download && activeBucket ? (object) => {
          const target = objectById.get(object.id);
          if (!target) return;
          void run(
            `download-${target.id}`,
            () => download({ bucketKey: activeBucket.key, objectKey: target.key }),
            'The file could not be downloaded.'
          );
        } : undefined}
        onDropFiles={uploadFiles ? (files) => uploadFiles(Array.from(files)) : undefined}
        onEmptyStateAction={!activeBucket
          ? createBucket ? () => setCreateOpen(true) : undefined
          : uploadFiles ? () => fileInputRef.current?.click() : undefined}
        onNavigate={navigate ? (target) => openPath(target ?? '', `navigate-${target ?? 'root'}`) : undefined}
        onNewBucket={createBucket ? () => setCreateOpen(true) : undefined}
        onOpenFolder={navigate ? (object) => {
          const target = objectById.get(object.id);
          if (target) openPath(target.key, `navigate-${target.key}`);
        } : undefined}
        onQueryChange={setQuery}
        onSelectBucket={(bucketId) => {
          const bucket = data?.buckets.find((candidate) => candidate.id === bucketId);
          if (!bucket || bucket.key === activeBucket?.key || !selectBucket) return;
          setQuery('');
          void run(`bucket-${bucket.key}`, () => selectBucket({ bucketKey: bucket.key }), 'The bucket could not be opened.');
        }}
        onSelectionChange={() => {}}
        onSortChange={setSort}
        onUpload={uploadFiles ? () => fileInputRef.current?.click() : undefined}
        query={query}
        segments={pathSegments.map((segment, index) => ({ label: segment, path: pathSegments.slice(0, index + 1).join('/') }))}
        selectable={false}
        selectedBucketId={activeBucket?.id ?? null}
        selectedIds={[]}
        sort={sort}
      />
      {uploadFiles ? (
        <input
          aria-label='Upload files'
          className='sr-only'
          disabled={Boolean(pendingAction)}
          multiple
          name='files'
          onChange={(event) => {
            const files = Array.from(event.currentTarget.files ?? []);
            if (files.length > 0) uploadFiles(files);
            event.currentTarget.value = '';
          }}
          ref={fileInputRef}
          tabIndex={-1}
          type='file'
        />
      ) : null}
      {createBucket ? (
        <CreateBucketDialog
          onCreate={(input) => run('create-bucket', () => createBucket(input), 'The bucket could not be created.', false)}
          onOpenChange={setCreateOpen}
          open={createOpen}
        />
      ) : null}
      {deleteObject && activeBucket ? (
        <DeleteObjectDialog
          object={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDelete={(object) => run(
            `delete-${object.id}`,
            () => deleteObject({ bucketKey: activeBucket.key, objectKey: object.key }),
            'The object could not be deleted.',
            false
          )}
        />
      ) : null}
    </div>
  );
}
