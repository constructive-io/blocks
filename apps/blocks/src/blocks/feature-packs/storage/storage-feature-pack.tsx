'use client';

import * as React from 'react';
import {
  BoxIcon,
  ChevronRightIcon,
  DownloadIcon,
  FileIcon,
  FolderIcon,
  FolderOpenIcon,
  MoreHorizontalIcon,
  PlusIcon,
  Trash2Icon,
  UploadIcon
} from 'lucide-react';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@constructive-io/ui/alert-dialog';
import { Badge } from '@constructive-io/ui/badge';
import { Button } from '@constructive-io/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@constructive-io/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogTitle,
  DialogTrigger
} from '@constructive-io/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@constructive-io/ui/dropdown-menu';
import { Field } from '@constructive-io/ui/field';
import { Input } from '@constructive-io/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@constructive-io/ui/table';

import {
  canPerform,
  normalizeFeaturePackError,
  type FeatureActionPolicy,
  type FeatureActionResult,
  type FeaturePackError,
  type FeaturePackResource
} from '../shared/feature-pack-contracts';
import { FeaturePackBoundary, FeaturePackPageHeader } from '../shared/feature-pack-ui';

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
}>;

function CreateBucketDialog({
  onCreate
}: Readonly<{
  onCreate: (input: { name: string; access: 'public' | 'private' }) => Promise<boolean>;
}>) {
  const [open, setOpen] = React.useState(false);
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
        setOpen(false);
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
        setOpen(nextOpen);
        if (!nextOpen) setError(undefined);
      }}
    >
      <DialogTrigger render={<Button variant='outline' />}>
        <PlusIcon data-icon='inline-start' />
        New bucket
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={(event) => void submit(event)}>
          <DialogHeader>
            <DialogTitle>Create a storage bucket</DialogTitle>
            <DialogDescription>Bucket access sets the default delivery boundary; database policy remains authoritative.</DialogDescription>
          </DialogHeader>
          <DialogPanel className='flex flex-col gap-4'>
            <Field error={error} htmlFor={`${fieldId}-name`} label='Bucket name' required>
              <Input
                aria-invalid={Boolean(error)}
                id={`${fieldId}-name`}
                onChange={(event) => setName(event.currentTarget.value)}
                required
                value={name}
              />
            </Field>
            <Field htmlFor={`${fieldId}-access`} label='Access'>
              <div className='grid grid-cols-2 gap-2' id={`${fieldId}-access`}>
                {(['private', 'public'] as const).map((candidate) => (
                  <Button
                    aria-pressed={access === candidate}
                    key={candidate}
                    onClick={() => setAccess(candidate)}
                    type='button'
                    variant={access === candidate ? 'secondary' : 'outline'}
                  >
                    {candidate === 'private' ? 'Private' : 'Public'}
                  </Button>
                ))}
              </div>
            </Field>
          </DialogPanel>
          <DialogFooter>
            <Button disabled={pending || !name.trim()} type='submit'>{pending ? 'Creating…' : 'Create bucket'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StorageObjectActions({
  object,
  onDelete,
  onDownload
}: Readonly<{
  object: StorageObject;
  onDelete?: () => Promise<boolean>;
  onDownload?: () => Promise<boolean>;
}>) {
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deletePending, setDeletePending] = React.useState(false);

  if (!onDelete && !onDownload) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger aria-label={`Actions for ${object.name}`} render={<Button size='icon' variant='ghost' />}>
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          {onDownload ? (
            <DropdownMenuItem onClick={() => void onDownload()}>
              <DownloadIcon />
              Download
            </DropdownMenuItem>
          ) : null}
          {onDelete ? (
            <DropdownMenuItem onClick={() => setDeleteOpen(true)} variant='destructive'>
              <Trash2Icon />
              Delete
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      {onDelete ? (
        <AlertDialog
          onOpenChange={(nextOpen) => {
            if (!deletePending) setDeleteOpen(nextOpen);
          }}
          open={deleteOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {object.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes the object from this bucket. This action cannot be undone from the console.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletePending}>Cancel</AlertDialogCancel>
              <Button
                disabled={deletePending}
                onClick={() => {
                  setDeletePending(true);
                  void onDelete().then((succeeded) => {
                    if (succeeded) setDeleteOpen(false);
                  }).finally(() => setDeletePending(false));
                }}
                variant='destructive'
              >
                {deletePending ? 'Deleting…' : 'Delete object'}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </>
  );
}

export function StorageFeaturePack({
  resource,
  policy,
  actions,
  onError
}: StorageFeaturePackProps) {
  const run = async (action: () => FeatureActionResult, fallback: string): Promise<boolean> => {
    try {
      await action();
      return true;
    } catch (cause) {
      onError?.(normalizeFeaturePackError(cause, fallback));
      return false;
    }
  };

  return (
    <div className='flex flex-col gap-6'>
      <FeaturePackPageHeader
        actions={
          resource.status === 'ready' && canPerform(policy, 'createBucket') && actions?.createBucket ? (
            <CreateBucketDialog onCreate={(input) => run(() => actions.createBucket!(input), 'The bucket could not be created.')} />
          ) : null
        }
        description='Browse buckets and objects through host-injected storage actions and database-scoped access.'
        eyebrow='Application files'
        title='Storage'
      />
      <FeaturePackBoundary
        emptyAction={
          canPerform(policy, 'createBucket') && actions?.createBucket ? (
            <CreateBucketDialog onCreate={(input) => run(() => actions.createBucket!(input), 'The bucket could not be created.')} />
          ) : null
        }
        emptyDescription='Create a bucket after the storage feature pack is installed on the database.'
        emptyTitle='No storage buckets'
        resource={resource}
      >
        {(data) => {
          const activeBucket = data.buckets.find((bucket) => bucket.key === data.activeBucketKey) ?? data.buckets[0];
          const path = data.path ?? '';
          const pathSegments = path.split('/').filter(Boolean);
          const canNavigate = canPerform(policy, 'navigate') && Boolean(actions?.navigate) && Boolean(activeBucket);
          const canSelectBucket = canPerform(policy, 'selectBucket') && Boolean(actions?.selectBucket);

          return (
            <div className='grid min-h-[32rem] gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]'>
              <Card className='h-fit' variant='flat'>
                <CardHeader>
                  <CardTitle className='text-sm'>Buckets</CardTitle>
                  <CardDescription>Each bucket keeps its own delivery and policy boundary.</CardDescription>
                </CardHeader>
                <CardContent className='flex flex-col gap-1'>
                  {data.buckets.map((bucket) => (
                    <Button
                      className='h-auto justify-start px-2 py-2 text-left'
                      disabled={bucket.key !== activeBucket?.key && !canSelectBucket}
                      key={bucket.id}
                      onClick={() => {
                        if (bucket.key !== activeBucket?.key && canPerform(policy, 'selectBucket') && actions?.selectBucket) {
                          void run(() => actions.selectBucket!({ bucketKey: bucket.key }), 'The bucket could not be opened.');
                        }
                      }}
                      variant={bucket.key === activeBucket?.key ? 'secondary' : 'ghost'}
                    >
                      <BoxIcon />
                      <span className='min-w-0 flex-1'>
                        <span className='block truncate'>{bucket.name}</span>
                        <span className='text-muted-foreground block text-xs'>{bucket.objectCount ?? '—'} objects</span>
                      </span>
                      <Badge variant='outline'>{bucket.access}</Badge>
                    </Button>
                  ))}
                </CardContent>
              </Card>

              <div className='min-w-0'>
                <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                  <nav aria-label='Storage path' className='flex min-w-0 items-center gap-1 text-sm'>
                    {canNavigate && path ? (
                      <Button
                        className='px-2'
                        onClick={() => activeBucket && void run(
                          () => actions?.navigate?.({ bucketKey: activeBucket.key, path: '' }),
                          'The folder could not be opened.'
                        )}
                        size='sm'
                        variant='ghost'
                      >
                        <FolderOpenIcon data-icon='inline-start' />
                        {activeBucket?.name ?? 'Bucket'}
                      </Button>
                    ) : (
                      <span className='flex items-center gap-2 px-2 py-1.5 font-medium'>
                        <FolderOpenIcon aria-hidden='true' className='size-4' />
                        {activeBucket?.name ?? 'Bucket'}
                      </span>
                    )}
                    {pathSegments.map((segment, index) => {
                      const segmentPath = pathSegments.slice(0, index + 1).join('/');
                      return (
                        <React.Fragment key={segmentPath}>
                          <ChevronRightIcon aria-hidden='true' className='text-muted-foreground size-4' />
                          {canNavigate && segmentPath !== path ? (
                            <Button
                              className='max-w-36 truncate px-2'
                              onClick={() => activeBucket && void run(
                                () => actions?.navigate?.({ bucketKey: activeBucket.key, path: segmentPath }),
                                'The folder could not be opened.'
                              )}
                              size='sm'
                              variant='ghost'
                            >
                              {segment}
                            </Button>
                          ) : (
                            <span className='max-w-36 truncate px-2 py-1.5'>{segment}</span>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </nav>
                  {activeBucket && canPerform(policy, 'upload') && actions?.upload ? (
                    <Button asChild>
                      <label>
                        <UploadIcon data-icon='inline-start' />
                        Upload files
                        <Input
                          className='sr-only'
                          multiple
                          onChange={(event) => {
                            const files = Array.from(event.currentTarget.files ?? []);
                            if (files.length > 0) {
                              void run(
                                () => actions.upload!({ bucketKey: activeBucket.key, path, files }),
                                'The files could not be uploaded.'
                              );
                            }
                            event.currentTarget.value = '';
                          }}
                          type='file'
                        />
                      </label>
                    </Button>
                  ) : null}
                </div>

                <Card variant='flat'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Updated</TableHead>
                        <TableHead className='w-12'><span className='sr-only'>Actions</span></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.objects.map((object) => (
                        <TableRow key={object.id}>
                          <TableCell>
                            {object.kind === 'folder' && canNavigate ? (
                              <Button
                                className='max-w-72 justify-start px-1'
                                onClick={() => activeBucket && void run(
                                  () => actions?.navigate?.({ bucketKey: activeBucket.key, path: object.key }),
                                  'The folder could not be opened.'
                                )}
                                size='sm'
                                variant='ghost'
                              >
                                <FolderIcon />
                                <span className='truncate'>{object.name}</span>
                              </Button>
                            ) : (
                              <span className='flex max-w-72 items-center gap-2 px-1 py-1.5'>
                                {object.kind === 'folder' ? <FolderIcon aria-hidden='true' /> : <FileIcon aria-hidden='true' />}
                                <span className='truncate'>{object.name}</span>
                              </span>
                            )}
                          </TableCell>
                          <TableCell>{object.contentType ?? object.kind}</TableCell>
                          <TableCell>{object.sizeLabel ?? '—'}</TableCell>
                          <TableCell>{object.updatedAt ?? '—'}</TableCell>
                          <TableCell>
                            {activeBucket ? (
                              <StorageObjectActions
                                object={object}
                                onDelete={canPerform(policy, 'deleteObject') && actions?.deleteObject
                                  ? () => run(
                                    () => actions.deleteObject!({ bucketKey: activeBucket.key, objectKey: object.key }),
                                    'The object could not be deleted.'
                                  )
                                  : undefined}
                                onDownload={object.kind === 'file' && canPerform(policy, 'download') && actions?.download
                                  ? () => run(
                                    () => actions.download!({ bucketKey: activeBucket.key, objectKey: object.key }),
                                    'The file could not be downloaded.'
                                  )
                                  : undefined}
                              />
                            ) : null}
                          </TableCell>
                        </TableRow>
                      ))}
                      {data.objects.length === 0 ? (
                        <TableRow>
                          <TableCell className='h-32 text-center' colSpan={5}>
                            <p className='font-medium'>This folder is empty</p>
                            <p className='text-muted-foreground text-sm'>Upload a file to add the first object.</p>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                </Card>
              </div>
            </div>
          );
        }}
      </FeaturePackBoundary>
    </div>
  );
}
