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
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '../sheet';
import { cn } from '../../lib/utils';
import { TooltipIconButton } from '../workspace-kit/primitives';
import { Bezel, dashedRule, KeyValueList } from '../workspace-kit/surface';
import { FileGlyph } from './file-type-icon';
import type { StorageObject } from './types';
import { formatDateTime, humanizeBytes, objectDisplayName } from './utils';
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
	 * is in flight so an image preview shows a placeholder instead of a broken `<img>`.
	 * The host should resolve `object.downloadUrl` before or at open.
	 */
	isPreviewLoading?: boolean;
}

type ObjectDetailBodyProps = Pick<ObjectDetailSheetProps, 'onDownload' | 'onCopyLink' | 'onRename' | 'onDelete' | 'isPreviewLoading'> & {
	object: StorageObject;
};

/**
 * Inner body, remounted per object id (via `key`) so the rename draft
 * initializes from props with plain `useState` — no reset effect needed.
 */
function ObjectDetailBody({ object, onDownload, onCopyLink, onRename, onDelete, isPreviewLoading }: ObjectDetailBodyProps) {
	const displayName = objectDisplayName(object);
	const [isRenaming, setIsRenaming] = React.useState(false);
	const [draftName, setDraftName] = React.useState(displayName);

	const isImageType = object.mimeType.startsWith('image/');
	const showImage = isImageType && Boolean(object.downloadUrl) && !isPreviewLoading;

	const commitRename = () => {
		const trimmed = draftName.trim();
		if (trimmed && trimmed !== displayName) onRename?.(object.id, trimmed);
		setIsRenaming(false);
	};

	return (
		<div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
			<header className="flex items-start gap-3 p-4 pr-12">
				<FileGlyph mimeType={object.mimeType} className="mt-0.5" />
				<div className="min-w-0 flex-1">
					<SheetTitle className="truncate text-sm font-medium">{displayName}</SheetTitle>
					<SheetDescription className="truncate font-mono text-xs">{object.key}</SheetDescription>
				</div>
			</header>

			<div className="px-4">
				<Bezel innerClassName="grid aspect-[4/3] place-items-center">
					{isImageType && isPreviewLoading ? (
						<span aria-label="Loading preview" role="status" className="size-full bg-muted motion-safe:animate-pulse" />
					) : showImage ? (
						<img src={object.downloadUrl ?? undefined} alt={displayName} className="size-full object-contain" />
					) : (
						<span className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
							<FileGlyph mimeType={object.mimeType} className="size-12 rounded-[14px] [&_svg]:size-5" />
							{isImageType ? 'No preview link yet' : 'No preview for this type'}
						</span>
					)}
				</Bezel>
			</div>

			{isRenaming ? (
				<div className="flex items-center gap-1.5 px-4 pt-4">
					<Input
						autoFocus
						value={draftName}
						onChange={(event) => setDraftName(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === 'Enter') commitRename();
							if (event.key === 'Escape') {
								event.stopPropagation();
								setIsRenaming(false);
							}
						}}
						aria-label="New file name"
						className="h-8"
					/>
					<TooltipIconButton label="Save name" variant="raised" size="lg" onClick={commitRename}>
						<CheckIcon aria-hidden="true" className="size-3.5" />
					</TooltipIconButton>
					<TooltipIconButton label="Cancel rename" size="lg" onClick={() => setIsRenaming(false)}>
						<XIcon aria-hidden="true" className="size-3.5" />
					</TooltipIconButton>
				</div>
			) : onDownload || onCopyLink || onRename || onDelete ? (
				<div className="flex items-center gap-2 px-4 pt-4">
					{onDownload ? (
						<Button size="sm" onClick={() => onDownload(object)}>
							<DownloadIcon aria-hidden="true" data-icon="inline-start" />
							Download
						</Button>
					) : null}
					{onCopyLink ? (
						<Button size="sm" variant="outline" onClick={() => onCopyLink(object)}>
							<CopyIcon aria-hidden="true" data-icon="inline-start" />
							Copy link
						</Button>
					) : null}
					<span className="flex-1" />
					{onRename ? (
						<TooltipIconButton label="Rename" size="lg" onClick={() => setIsRenaming(true)}>
							<PencilIcon aria-hidden="true" className="size-3.5" />
						</TooltipIconButton>
					) : null}
					{onDelete ? (
						<AlertDialog>
							<AlertDialogTrigger
								aria-label="Delete file"
								className="grid size-8 cursor-pointer place-items-center rounded-md text-destructive outline-none hover:bg-destructive/10 focus-visible:ring-[3px] focus-visible:ring-ring/50"
							>
								<Trash2Icon aria-hidden="true" className="size-3.5" />
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>Delete this file?</AlertDialogTitle>
									<AlertDialogDescription>{`"${displayName}" will be permanently removed. This action cannot be undone.`}</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>Cancel</AlertDialogCancel>
									<AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => onDelete(object.id)}>
										Delete
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					) : null}
				</div>
			) : null}

			<div className={cn('mx-4 mt-4 mb-4 border-t pt-1', dashedRule)}>
				<KeyValueList
					items={[
						{ key: 'size', label: 'Size', value: humanizeBytes(object.size) },
						{ key: 'type', label: 'Type', value: <span className="break-all">{object.mimeType}</span> },
						{ key: 'access', label: 'Access', value: <VisibilityBadge visibility={object.isPublic ? 'public' : 'private'} /> },
						...(object.status ? [{ key: 'status', label: 'Status', value: <ObjectStatusBadge status={object.status} /> }] : []),
						{ key: 'created', label: 'Created', value: <span suppressHydrationWarning>{formatDateTime(object.createdAt)}</span> },
						...(object.updatedAt
							? [{ key: 'modified', label: 'Modified', value: <span suppressHydrationWarning>{formatDateTime(object.updatedAt)}</span> }]
							: []),
						{ key: 'filename', label: 'Filename', value: <span className="break-all">{object.filename ?? '—'}</span> },
					]}
				/>
			</div>
		</div>
	);
}

/**
 * `ObjectDetailSheet` — right-side detail panel for one object: its glyph
 * and key, a framed preview (the image when a signed link is ready, the
 * file glyph otherwise), Download and Copy link, rename in place, a
 * confirmed delete, and the metadata. Fully controlled.
 */
export function ObjectDetailSheet({ object, open, onOpenChange, onDownload, onCopyLink, onRename, onDelete, isPreviewLoading }: ObjectDetailSheetProps) {
	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
				{object ? (
					<ObjectDetailBody
						key={object.id}
						object={object}
						onDownload={onDownload}
						onCopyLink={onCopyLink}
						onRename={onRename}
						onDelete={onDelete}
						isPreviewLoading={isPreviewLoading}
					/>
				) : null}
			</SheetContent>
		</Sheet>
	);
}
