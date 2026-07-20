'use client';

import * as React from 'react';
import { CheckIcon, CopyIcon, DownloadIcon, PencilIcon, Trash2Icon, XIcon } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../alert-dialog';
import { Button } from '../button';
import { Input } from '../input';
import { Separator } from '../separator';
import { Skeleton } from '../skeleton';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../sheet';
import { cn } from '../../lib/utils';
import { FileTypeIcon } from './file-type-icon';
import type { StorageObject } from './types';
import { humanizeBytes, formatDateTime, objectDisplayName } from './utils';
import { ObjectStatusBadge, VisibilityBadge } from './visibility-badge';

interface ObjectDetailSheetProps {
  object: StorageObject | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownload?: (object: StorageObject) => void;
  onCopyLink?: (object: StorageObject) => void;
  /** Commit a rename. The sheet owns only the draft text field. */
  onRename?: (id: string, newName: string) => void;
  onDelete?: (id: string) => void;
  /**
   * `downloadUrl` is a per-row signed field that the host fetches lazily when the
   * sheet opens (it is omitted from list queries). Set this true while that fetch
   * is in flight so an image preview shows a Skeleton instead of a broken `<img>`.
   * The host should resolve `object.downloadUrl` before or at open.
   */
  isPreviewLoading?: boolean;
}

interface MetadataRowProps {
  label: string;
  children: React.ReactNode;
}

function MetadataRow({ label, children }: MetadataRowProps) {
  return (
    <div className="grid grid-cols-[7rem_1fr] items-start gap-2 py-1.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm">{children}</dd>
    </div>
  );
}

type ObjectDetailBodyProps = Required<Pick<ObjectDetailSheetProps, 'object'>> &
  Pick<ObjectDetailSheetProps, 'onDownload' | 'onCopyLink' | 'onRename' | 'onDelete' | 'isPreviewLoading'> & {
    object: StorageObject;
  };

/**
 * Inner body, remounted per object id (via `key`) so the rename draft
 * initializes from props with plain `useState` — no reset effect needed.
 */
function ObjectDetailBody({
  object,
  onDownload,
  onCopyLink,
  onRename,
  onDelete,
  isPreviewLoading,
}: ObjectDetailBodyProps) {
  const displayName = objectDisplayName(object);
  const [isRenaming, setIsRenaming] = React.useState(false);
  const [draftName, setDraftName] = React.useState(displayName);

  const isImageType = object.mimeType.startsWith('image/');
  const isImage = isImageType && !!object.downloadUrl;

  const commitRename = () => {
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== displayName) {
      onRename?.(object.id, trimmed);
    }
    setIsRenaming(false);
  };

  return (
    <>
      <SheetHeader className="pb-3 text-left">
        <SheetTitle className="truncate pr-8">{displayName}</SheetTitle>
        <SheetDescription className="truncate font-mono text-xs">{object.key}</SheetDescription>
      </SheetHeader>

      {/* Preview */}
      <div className="flex items-center justify-center rounded-lg border bg-muted/40 p-4">
        {isImageType && isPreviewLoading ? (
          <Skeleton className="size-40 rounded-md" />
        ) : isImage ? (
          <img
            src={object.downloadUrl ?? undefined}
            alt={displayName}
            className="size-40 rounded-md object-cover outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
          />
        ) : (
          <div className="flex size-40 items-center justify-center rounded-md bg-background">
            <FileTypeIcon mimeType={object.mimeType} className="size-16 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Rename (inline draft) */}
      <div className="py-3">
        {isRenaming ? (
          <div className="flex items-center gap-2">
            <Input
              autoFocus
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') commitRename();
                if (event.key === 'Escape') setIsRenaming(false);
              }}
              aria-label="New file name"
            />
            <Button size="icon-sm" aria-label="Save name" onClick={commitRename}>
              <CheckIcon aria-hidden />
            </Button>
            <Button size="icon-sm" variant="ghost" aria-label="Cancel rename" onClick={() => setIsRenaming(false)}>
              <XIcon aria-hidden />
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => setIsRenaming(true)}>
            <PencilIcon aria-hidden />
            Rename
          </Button>
        )}
      </div>

      <Separator />

      {/* Metadata */}
      <dl className="py-2">
        <MetadataRow label="Filename">
          <span className="block truncate">{object.filename ?? '—'}</span>
        </MetadataRow>
        <MetadataRow label="Size">
          <span className="tabular-nums">{humanizeBytes(object.size)}</span>
        </MetadataRow>
        <MetadataRow label="Type">
          <span className="break-all">{object.mimeType}</span>
        </MetadataRow>
        <MetadataRow label="Modified">
          <span className="tabular-nums">{formatDateTime(object.updatedAt ?? object.createdAt)}</span>
        </MetadataRow>
        <MetadataRow label="Key">
          <span className="block truncate font-mono text-xs">{object.key}</span>
        </MetadataRow>
        <MetadataRow label="Visibility">
          <VisibilityBadge visibility={object.isPublic ? 'public' : 'private'} size="sm" />
        </MetadataRow>
        {object.status && (
          <MetadataRow label="Status">
            <ObjectStatusBadge status={object.status} size="sm" />
          </MetadataRow>
        )}
      </dl>

      <Separator />

      {/* Actions */}
      <div className="flex flex-col gap-2 pt-4">
        <Button onClick={() => onDownload?.(object)}>
          <DownloadIcon aria-hidden />
          Download
        </Button>
        <Button variant="outline" onClick={() => onCopyLink?.(object)}>
          <CopyIcon aria-hidden />
          Copy link
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive-outline">
              <Trash2Icon aria-hidden />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this file?</AlertDialogTitle>
              <AlertDialogDescription>
                {`"${displayName}" will be permanently removed. This action cannot be undone.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className={cn('bg-destructive text-destructive-foreground hover:bg-destructive/90')}
                onClick={() => onDelete?.(object.id)}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}

/**
 * `ObjectDetailSheet` — right-side detail panel for a single object. Image
 * thumbnail (image MIME + download URL) or large file-type glyph, a metadata
 * list, and primary actions. Delete is confirmed through an AlertDialog. The
 * sheet is fully controlled (`open` / `onOpenChange`); rename keeps a local
 * draft for the text field only.
 */
export function ObjectDetailSheet({
  object,
  open,
  onOpenChange,
  onDownload,
  onCopyLink,
  onRename,
  onDelete,
  isPreviewLoading,
}: ObjectDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
        {object && (
          <ObjectDetailBody
            key={object.id}
            object={object}
            onDownload={onDownload}
            onCopyLink={onCopyLink}
            onRename={onRename}
            onDelete={onDelete}
            isPreviewLoading={isPreviewLoading}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
