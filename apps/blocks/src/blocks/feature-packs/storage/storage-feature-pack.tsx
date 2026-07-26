'use client';

import * as React from 'react';
import {
  BoxIcon,
  ChevronRightIcon,
  CircleAlertIcon,
  DownloadIcon,
  FileIcon,
  FolderIcon,
  FolderOpenIcon,
  LoaderCircleIcon,
  MoreHorizontalIcon,
  PlusIcon,
  Trash2Icon,
  UploadIcon
} from 'lucide-react';

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
import { Badge } from '@constructive-io/ui/badge';
import { Button, buttonVariants } from '@constructive-io/ui/button';
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
import { Field, FieldLabel, FieldLegend, FieldSet } from '@constructive-io/ui/field';
import { Input } from '@constructive-io/ui/input';
import { RadioGroup, RadioGroupItem } from '@constructive-io/ui/radio-group';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@constructive-io/ui/table';
import { cn } from '@/lib/utils';

import {
  canPerform,
  normalizeFeaturePackError,
  type FeatureActionPolicy,
  type FeatureActionResult,
  type FeaturePackError,
  type FeaturePackResource
} from '../shared/feature-pack-contracts';
import {
  FeaturePackBoundary,
  FeaturePackLimitations,
  FeaturePackPageHeader,
  FeaturePackTimestamp
} from '../shared/feature-pack-ui';

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
                className='grid grid-cols-2 gap-2'
                name='bucket-access'
                onValueChange={(value) => setAccess(value as 'public' | 'private')}
                value={access}
              >
                {(['private', 'public'] as const).map((candidate) => (
                  <FieldLabel className='rounded-lg border px-3 py-2' htmlFor={`${fieldId}-access-${candidate}`} key={candidate}>
                    <RadioGroupItem id={`${fieldId}-access-${candidate}`} value={candidate} />
                    {candidate === 'private' ? 'Private' : 'Public'}
                  </FieldLabel>
                ))}
              </RadioGroup>
            </FieldSet>
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
  busy,
  disabled,
  object,
  onDelete,
  onDownload
}: Readonly<{
  busy?: 'delete' | 'download';
  disabled?: boolean;
  object: StorageObject;
  onDelete?: () => Promise<boolean>;
  onDownload?: () => Promise<boolean>;
}>) {
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deletePending, setDeletePending] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string>();

  if (!onDelete && !onDownload) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-busy={Boolean(busy)}
          aria-label={busy === 'download'
            ? `Downloading ${object.name}`
            : busy === 'delete'
              ? `Deleting ${object.name}`
              : `Actions for ${object.name}`}
          disabled={disabled}
          render={<Button disabled={disabled} size='icon' variant='ghost' />}
        >
          {busy
            ? <LoaderCircleIcon className='animate-spin motion-reduce:animate-none' />
            : <MoreHorizontalIcon />}
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
            if (!deletePending) {
              setDeleteOpen(nextOpen);
              if (!nextOpen) setDeleteError(undefined);
            }
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
            {deleteError ? (
              <Alert role='alert' variant='destructive'>
                <AlertDescription>{deleteError}</AlertDescription>
              </Alert>
            ) : null}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletePending}>Cancel</AlertDialogCancel>
              <Button
                disabled={deletePending}
                onClick={() => {
                  setDeletePending(true);
                  setDeleteError(undefined);
                  void onDelete()
                    .then((succeeded) => {
                      if (succeeded) setDeleteOpen(false);
                      else setDeleteError('The object could not be deleted. Check your access and try again.');
                    })
                    .finally(() => setDeletePending(false));
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
  const createBucket = actions?.createBucket;
  const upload = actions?.upload;
  const [pendingAction, setPendingAction] = React.useState<string>();
  const [actionError, setActionError] = React.useState<string>();
  const pendingActionRef = React.useRef<string | undefined>(undefined);
  const canCreateBucket = canPerform(policy, 'createBucket') && Boolean(createBucket);
  const canUpload = canPerform(policy, 'upload') && Boolean(upload);
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

  return (
    <div className='flex flex-col gap-6'>
      <FeaturePackPageHeader
        actions={
          resource.status === 'ready' && canCreateBucket && createBucket ? (
            <CreateBucketDialog onCreate={(input) => run(
              'create-bucket',
              () => createBucket(input),
              'The bucket could not be created.',
              false
            )} />
          ) : null
        }
        title='Storage'
      />
      <FeaturePackLimitations
        limitations={resource.status === 'ready' ? resource.limitations : undefined}
      />
      {actionError ? (
        <Alert role='alert' variant='destructive'>
          <CircleAlertIcon aria-hidden='true' />
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      ) : null}
      <FeaturePackBoundary
        emptyAction={
          canCreateBucket && createBucket ? (
            <CreateBucketDialog onCreate={(input) => run(
              'create-bucket',
              () => createBucket(input),
              'The bucket could not be created.',
              false
            )} />
          ) : null
        }
        emptyDescription={canCreateBucket
          ? 'Create a bucket to add the first storage boundary.'
          : 'No storage buckets are visible to this session, and the connected endpoint does not expose bucket creation.'}
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
                      aria-busy={pendingAction === `bucket-${bucket.key}`}
                      aria-pressed={bucket.key === activeBucket?.key}
                      className='h-auto justify-start px-2 py-2 text-left'
                      disabled={Boolean(pendingAction) || (bucket.key !== activeBucket?.key && !canSelectBucket)}
                      key={bucket.id}
                      onClick={() => {
                        if (bucket.key !== activeBucket?.key && canPerform(policy, 'selectBucket') && actions?.selectBucket) {
                          void run(
                            `bucket-${bucket.key}`,
                            () => actions.selectBucket!({ bucketKey: bucket.key }),
                            'The bucket could not be opened.'
                          );
                        }
                      }}
                      variant={bucket.key === activeBucket?.key ? 'secondary' : 'ghost'}
                    >
                      {pendingAction === `bucket-${bucket.key}`
                        ? <LoaderCircleIcon aria-hidden='true' className='animate-spin motion-reduce:animate-none' />
                        : <BoxIcon />}
                      <span className='min-w-0 flex-1'>
                        <span className='block truncate' title={bucket.name}>{bucket.name}</span>
                        <span className='text-muted-foreground block text-xs tabular-nums'>{bucket.objectCount ?? '—'} objects</span>
                      </span>
                      <Badge className='max-w-24' title={bucket.access} variant='outline'>
                        <span className='truncate'>{bucket.access}</span>
                      </Badge>
                    </Button>
                  ))}
                </CardContent>
              </Card>

              <div className='min-w-0'>
                <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                  <nav aria-label='Storage path' className='flex min-w-0 items-center gap-1 overflow-x-auto pb-1 text-sm'>
                    {canNavigate && path ? (
                      <Button
                        className='px-2'
                        disabled={Boolean(pendingAction)}
                        onClick={() => activeBucket && void run(
                          'navigate-root',
                          () => actions?.navigate?.({ bucketKey: activeBucket.key, path: '' }),
                          'The folder could not be opened.'
                        )}
                        size='sm'
                        variant='ghost'
                      >
                        <FolderOpenIcon data-icon='inline-start' />
                        <span className='max-w-48 truncate' title={activeBucket?.name ?? 'Bucket'}>
                          {activeBucket?.name ?? 'Bucket'}
                        </span>
                      </Button>
                    ) : (
                      <span className='flex items-center gap-2 px-2 py-1.5 font-medium'>
                        <FolderOpenIcon aria-hidden='true' className='size-4' />
                        <span className='max-w-48 truncate' title={activeBucket?.name ?? 'Bucket'}>
                          {activeBucket?.name ?? 'Bucket'}
                        </span>
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
                              disabled={Boolean(pendingAction)}
                              onClick={() => activeBucket && void run(
                                `navigate-${segmentPath}`,
                                () => actions?.navigate?.({ bucketKey: activeBucket.key, path: segmentPath }),
                                'The folder could not be opened.'
                              )}
                              size='sm'
                              variant='ghost'
                            >
                              <span className='truncate' title={segment}>{segment}</span>
                            </Button>
                          ) : (
                            <span className='max-w-36 truncate px-2 py-1.5' title={segment}>{segment}</span>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </nav>
                  {activeBucket && canUpload && upload ? (
                    <label
                      aria-busy={pendingAction === 'upload'}
                      aria-disabled={Boolean(pendingAction)}
                      className={buttonVariants({
                        className: cn(
                          'focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]',
                          pendingAction ? 'pointer-events-none opacity-64' : undefined
                        )
                      })}
                    >
                      {pendingAction === 'upload'
                        ? <LoaderCircleIcon className='animate-spin motion-reduce:animate-none' data-icon='inline-start' />
                        : <UploadIcon data-icon='inline-start' />}
                      {pendingAction === 'upload' ? 'Uploading…' : 'Upload files'}
                      <Input
                        aria-label='Upload files'
                        className='sr-only'
                        disabled={Boolean(pendingAction)}
                        multiple
                        name='files'
                        onChange={(event) => {
                          const files = Array.from(event.currentTarget.files ?? []);
                          if (files.length > 0) {
                            void run(
                              'upload',
                              () => upload({ bucketKey: activeBucket.key, path, files }),
                              'The files could not be uploaded.'
                            );
                          }
                          event.currentTarget.value = '';
                        }}
                        type='file'
                        unstyled
                      />
                    </label>
                  ) : null}
                </div>

                <Card variant='flat'>
                  <Table
                    aria-label='Storage objects'
                    className='block lg:table'
                    containerClassName='overflow-visible lg:overflow-x-auto'
                  >
                    <TableHeader className='sr-only lg:not-sr-only lg:table-header-group'>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Updated</TableHead>
                        <TableHead className='w-12'><span className='sr-only'>Actions</span></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className='block lg:table-row-group'>
                      {data.objects.map((object) => (
                        <TableRow
                          className='grid grid-cols-[minmax(0,1fr)_minmax(0,.6fr)_minmax(0,1fr)_auto] gap-x-3 gap-y-2 px-3 py-3 lg:table-row lg:px-0 lg:py-0'
                          key={object.id}
                        >
                          <TableCell className='col-span-3 min-w-0 p-0 whitespace-normal lg:table-cell lg:px-4 lg:py-3 lg:whitespace-nowrap'>
                            {object.kind === 'folder' && canNavigate ? (
                              <Button
                                aria-busy={pendingAction === `navigate-${object.key}`}
                                className='max-w-full justify-start px-1 lg:max-w-72'
                                disabled={Boolean(pendingAction)}
                                onClick={() => activeBucket && void run(
                                  `navigate-${object.key}`,
                                  () => actions?.navigate?.({ bucketKey: activeBucket.key, path: object.key }),
                                  'The folder could not be opened.'
                                )}
                                size='sm'
                                variant='ghost'
                              >
                                {pendingAction === `navigate-${object.key}`
                                  ? <LoaderCircleIcon aria-hidden='true' className='animate-spin motion-reduce:animate-none' />
                                  : <FolderIcon aria-hidden='true' />}
                                <span className='truncate' title={object.name}>{object.name}</span>
                              </Button>
                            ) : (
                              <span className='flex min-w-0 items-center gap-2 px-1 py-1.5 text-sm lg:max-w-72'>
                                {object.kind === 'folder'
                                  ? <FolderIcon aria-hidden='true' className='shrink-0' />
                                  : <FileIcon aria-hidden='true' className='shrink-0' />}
                                <span className='truncate' title={object.name}>{object.name}</span>
                              </span>
                            )}
                          </TableCell>
                          <TableCell className='min-w-0 p-0 align-top whitespace-normal lg:table-cell lg:max-w-48 lg:px-4 lg:py-3 lg:align-middle lg:whitespace-nowrap'>
                            <span className='text-muted-foreground block text-xs lg:hidden'>Type</span>
                            <span className='mt-0.5 block truncate lg:mt-0' title={object.contentType ?? object.kind}>
                              {object.contentType ?? object.kind}
                            </span>
                          </TableCell>
                          <TableCell className='min-w-0 p-0 align-top whitespace-normal lg:table-cell lg:px-4 lg:py-3 lg:align-middle lg:whitespace-nowrap'>
                            <span className='text-muted-foreground block text-xs lg:hidden'>Size</span>
                            <span className='mt-0.5 block whitespace-nowrap tabular-nums lg:mt-0'>{object.sizeLabel ?? '—'}</span>
                          </TableCell>
                          <TableCell className='min-w-0 p-0 align-top whitespace-normal lg:table-cell lg:px-4 lg:py-3 lg:align-middle lg:whitespace-nowrap'>
                            <span className='text-muted-foreground block text-xs lg:hidden'>Updated</span>
                            <span className='mt-0.5 block break-words lg:mt-0 lg:break-normal'>
                              <FeaturePackTimestamp value={object.updatedAt} />
                            </span>
                          </TableCell>
                          <TableCell className='col-start-4 row-start-1 p-0 text-right align-top lg:table-cell lg:px-4 lg:py-3 lg:text-left lg:align-middle'>
                            {activeBucket ? (
                              <StorageObjectActions
                                busy={pendingAction === `download-${object.id}`
                                  ? 'download'
                                  : pendingAction === `delete-${object.id}`
                                    ? 'delete'
                                    : undefined}
                                disabled={Boolean(pendingAction)}
                                object={object}
                                onDelete={canPerform(policy, 'deleteObject') && actions?.deleteObject
                                  ? () => run(
                                    `delete-${object.id}`,
                                    () => actions.deleteObject!({ bucketKey: activeBucket.key, objectKey: object.key }),
                                    'The object could not be deleted.',
                                    false
                                  )
                                  : undefined}
                                onDownload={object.kind === 'file' && canPerform(policy, 'download') && actions?.download
                                  ? () => run(
                                    `download-${object.id}`,
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
                        <TableRow className='grid lg:table-row'>
                          <TableCell className='col-span-4 h-32 text-center whitespace-normal lg:table-cell' colSpan={5}>
                            <p className='font-medium'>This folder is empty</p>
                            <p className='text-muted-foreground text-pretty text-sm'>
                              {canUpload
                                ? 'Upload a file to add the first object.'
                                : 'No objects are visible, and uploads are unavailable on the connected endpoint.'}
                            </p>
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
