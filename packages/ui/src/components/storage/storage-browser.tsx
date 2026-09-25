'use client';

import { HardDriveIcon, Loader2Icon, UploadCloudIcon, UploadIcon } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Button } from '../button';
import { SidebarFrame } from '../workspace-kit/nav';
import { SearchField, ViewHeader } from '../workspace-kit/primitives';
import { WorkspaceShell, type WorkspaceSidebarRenderProps } from '../workspace-kit/shell';
import { BucketRail } from './bucket-rail';
import { ObjectTable } from './object-table';
import { ObjectSelectionBar, ObjectSortMenu } from './object-toolbar';
import { StorageBreadcrumb, type StorageBreadcrumbSegment } from './storage-breadcrumb';
import { StorageEmptyState, type StorageEmptyStateVariant } from './storage-empty-state';
import type { ObjectSort, StorageBucket, StorageObject } from './types';
import { bucketDisplayName, formatCount } from './utils';
import { VISIBILITY, VisibilityBadge } from './visibility-badge';

interface StorageBrowserProps {
	// Buckets (left rail)
	buckets: StorageBucket[];
	selectedBucketId?: string | null;
	onSelectBucket: (bucketId: string) => void;
	onNewBucket?: () => void;
	/** Bucket whose contents are loading; its row shows a spinner. */
	busyBucketId?: string | null;
	/** When false, only the open bucket is enabled, e.g. while policy forbids switching. Default: true. */
	bucketsSelectable?: boolean;

	// Objects (right pane)
	objects: StorageObject[];
	selectedIds: string[];
	onSelectionChange: (selectedIds: string[]) => void;
	sort: ObjectSort;
	onSortChange: (sort: ObjectSort) => void;
	query: string;
	onQueryChange: (query: string) => void;

	// Folder breadcrumb (optional)
	segments?: StorageBreadcrumbSegment[];
	onNavigate?: (path: string | null) => void;

	// Object actions
	onOpenObject?: (object: StorageObject) => void;
	/** Opens a folder row (`kind: 'folder'`). Without it folder names are plain text. */
	onOpenFolder?: (object: StorageObject) => void;
	/** Show selection checkboxes and the selection bar. Default: true. */
	selectable?: boolean;
	onUpload?: () => void;
	/** An upload is running: the Upload button shows progress and waits. */
	isUploading?: boolean;
	/** Files dropped onto the object list. When set, dragging files over the list shows a drop target. */
	onDropFiles?: (files: FileList) => void;
	/** Delete the currently selected objects. Receives the selected ids. */
	onBulkDelete?: (ids: string[]) => void;
	/**
	 * Progress surface for an in-flight bulk delete: N-of-M + ids that failed.
	 * When set, the selection bar shows a "Deleting N/M" indicator and a
	 * partial-failure note.
	 */
	bulkDeleteProgress?: { done: number; total: number; failed: string[] };
	onClearSelection?: () => void;
	onDownload?: (object: StorageObject) => void;
	onCopyLink?: (object: StorageObject) => void;
	onRename?: (object: StorageObject) => void;
	onDelete?: (object: StorageObject) => void;

	// State flags
	isLoading?: boolean;
	/** Forwarded to the object table's empty body row (e.g. when a search filters all out). */
	emptyLabel?: string;
	/**
	 * When set, the right pane shows an empty state instead of the table.
	 * `'empty-bucket'` keeps the header; `'no-buckets'`, `'no-access'`, and
	 * `'not-provisioned'` take over the whole pane.
	 */
	emptyState?: StorageEmptyStateVariant | null;
	onEmptyStateAction?: () => void;
	onEmptyStateSecondaryAction?: () => void;

	/** Name in the sidebar header. Default: "Storage". */
	title?: string;
	defaultSidebarCollapsed?: boolean;
	className?: string;
}

function StorageMark({ title, collapsed }: { title: string; collapsed: boolean }) {
	return (
		<div className={cn('flex h-8 min-w-0 items-center gap-2 px-1.5', collapsed ? 'w-8 justify-center px-0' : 'flex-1')}>
			<span aria-hidden="true" className="grid size-5 shrink-0 place-items-center rounded-md bg-foreground text-background">
				<HardDriveIcon className="size-3" strokeWidth={2.25} />
			</span>
			{collapsed ? <span className="sr-only">{title}</span> : <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{title}</span>}
		</div>
	);
}

/** Tracks files dragged over an element, ignoring drags of text or links. */
function useFileDrop(onDropFiles: ((files: FileList) => void) | undefined) {
	const [over, setOver] = React.useState(false);
	if (!onDropFiles) return { over: false, handlers: {} };
	const hasFiles = (event: React.DragEvent) => Array.from(event.dataTransfer.types).includes('Files');
	return {
		over,
		handlers: {
			onDragOver(event: React.DragEvent<HTMLElement>) {
				if (!hasFiles(event)) return;
				event.preventDefault();
				event.dataTransfer.dropEffect = 'copy';
				setOver(true);
			},
			onDragLeave(event: React.DragEvent<HTMLElement>) {
				if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(false);
			},
			onDrop(event: React.DragEvent<HTMLElement>) {
				if (!hasFiles(event)) return;
				event.preventDefault();
				setOver(false);
				if (event.dataTransfer.files.length > 0) onDropFiles(event.dataTransfer.files);
			},
		},
	};
}

/**
 * `StorageBrowser` — a storage workspace: buckets in the workspace sidebar
 * (a drawer on narrow screens), and the selected bucket's files as a view
 * with a folder path, search, sort, upload, and a floating bar for the
 * selection. Files dropped on the list upload when `onDropFiles` is set.
 * Owns no data; the detail, config, and upload sheets render alongside it.
 */
export function StorageBrowser({
	buckets,
	selectedBucketId,
	onSelectBucket,
	onNewBucket,
	busyBucketId,
	bucketsSelectable = true,
	objects,
	selectedIds,
	onSelectionChange,
	sort,
	onSortChange,
	query,
	onQueryChange,
	segments,
	onNavigate,
	onOpenObject,
	onOpenFolder,
	selectable = true,
	onUpload,
	isUploading = false,
	onDropFiles,
	onBulkDelete,
	bulkDeleteProgress,
	onClearSelection,
	onDownload,
	onCopyLink,
	onRename,
	onDelete,
	isLoading,
	emptyLabel,
	emptyState,
	onEmptyStateAction,
	onEmptyStateSecondaryAction,
	title = 'Storage',
	defaultSidebarCollapsed,
	className,
}: StorageBrowserProps) {
	const selectedBucket = buckets.find((bucket) => bucket.id === selectedBucketId) ?? null;
	const drop = useFileDrop(selectedBucket && !isUploading ? onDropFiles : undefined);
	const hasFolders = objects.some((object) => object.kind === 'folder');
	const noun = (count: number) => (hasFolders ? (count === 1 ? 'item' : 'items') : count === 1 ? 'file' : 'files');
	const paneTakeover = emptyState === 'no-buckets' || emptyState === 'no-access' || emptyState === 'not-provisioned';
	const totalFiles = buckets.reduce((sum, bucket) => sum + (bucket.objectCount ?? 0), 0);

	const sidebar = ({ mode, collapsed, onCollapsedChange, onNavigate: closeDrawer }: WorkspaceSidebarRenderProps) => {
		const railCollapsed = mode === 'rail' && collapsed;
		return (
			<SidebarFrame
				label="Buckets"
				menu={<StorageMark title={title} collapsed={railCollapsed} />}
				collapsed={collapsed}
				onCollapsedChange={onCollapsedChange}
				drawer={mode === 'drawer'}
				onClose={closeDrawer}
				footer={
					railCollapsed || buckets.length === 0 ? null : (
						<p className="border-t border-sidebar-border px-3.5 py-2.5 text-xs text-muted-foreground tabular-nums">
							{formatCount(totalFiles)} {totalFiles === 1 ? 'file' : 'files'} in {buckets.length} {buckets.length === 1 ? 'bucket' : 'buckets'}
						</p>
					)
				}
			>
				<BucketRail
					buckets={buckets}
					selectedBucketId={selectedBucketId}
					onSelectBucket={(bucketId) => {
						onSelectBucket(bucketId);
						closeDrawer();
					}}
					onNewBucket={onNewBucket}
					collapsed={railCollapsed}
					busyBucketId={busyBucketId}
					selectable={bucketsSelectable}
				/>
			</SidebarFrame>
		);
	};

	let view: React.ReactNode;
	if (!selectedBucket || paneTakeover) {
		const prompt = !paneTakeover && buckets.length > 0;
		view = (
			<section aria-label={title} className="flex min-w-0 flex-1 flex-col">
				<ViewHeader icon={HardDriveIcon} title={title} />
				<div className="grid min-h-0 flex-1 place-items-center p-6">
					{prompt ? (
						<p className="text-[13px] text-muted-foreground">Choose a bucket to see its files.</p>
					) : (
						<StorageEmptyState
							variant={emptyState ?? 'no-buckets'}
							onAction={onEmptyStateAction ?? onNewBucket}
							onSecondaryAction={onEmptyStateSecondaryAction}
						/>
					)}
				</div>
			</section>
		);
	} else {
		const name = bucketDisplayName(selectedBucket);
		const visibility = VISIBILITY[selectedBucket.visibility] ?? VISIBILITY.private;
		view = (
			<section aria-label={name} className="relative flex min-w-0 flex-1 flex-col" {...drop.handlers}>
				<ViewHeader
					icon={visibility.icon}
					title={
						<span className="flex min-w-0 items-center gap-2">
							<span className="truncate">{name}</span>
							<VisibilityBadge visibility={selectedBucket.visibility} className="hidden @md/view:inline-flex" />
						</span>
					}
				>
					{onUpload ? (
						<Button size="sm" className="h-7" onClick={onUpload} disabled={isUploading} aria-busy={isUploading || undefined}>
							{isUploading ? (
								<Loader2Icon aria-hidden="true" data-icon="inline-start" className="motion-safe:animate-spin" />
							) : (
								<UploadIcon aria-hidden="true" data-icon="inline-start" />
							)}
							{isUploading ? 'Uploading…' : 'Upload'}
						</Button>
					) : null}
				</ViewHeader>

				<div className="min-h-0 flex-1 overflow-y-auto">
					<div className="flex flex-col gap-3 px-4 py-4 pb-20 @3xl/view:px-6">
						<div className="flex flex-col gap-2 @xl/view:flex-row @xl/view:items-center">
							<div className="min-w-0 flex-1">
								{segments?.length ? (
									<StorageBreadcrumb bucketKey={name} segments={segments} onNavigate={onNavigate} />
								) : (
									<p className="px-0.5 text-[13px] text-muted-foreground tabular-nums">
										{isLoading ? 'Loading files…' : `${formatCount(objects.length)} ${noun(objects.length)}`}
									</p>
								)}
							</div>
							{emptyState === 'empty-bucket' ? null : (
								<div className="flex items-center gap-2">
									<SearchField
										label="Search files"
										placeholder="Search files"
										value={query}
										onChange={(event) => onQueryChange(event.target.value)}
										className="min-w-0 flex-1 @xl/view:w-56 @xl/view:flex-none"
									/>
									<ObjectSortMenu sort={sort} onSortChange={onSortChange} />
								</div>
							)}
						</div>

						{emptyState === 'empty-bucket' ? (
							<div className="rounded-xl bg-card py-10 shadow-card">
								<StorageEmptyState variant="empty-bucket" onAction={onEmptyStateAction ?? onUpload} />
							</div>
						) : (
							<ObjectTable
								objects={objects}
								selectedIds={selectedIds}
								onSelectionChange={onSelectionChange}
								sort={sort}
								onSortChange={onSortChange}
								onOpenObject={onOpenObject}
								onOpenFolder={onOpenFolder}
								selectable={selectable}
								onDownload={onDownload}
								onCopyLink={onCopyLink}
								onRename={onRename}
								onDelete={onDelete}
								isLoading={isLoading}
								emptyLabel={emptyLabel}
							/>
						)}
					</div>
				</div>

				<div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center px-4 [&>*]:pointer-events-auto">
					<ObjectSelectionBar
						floating
						selectedCount={selectable ? selectedIds.length : 0}
						onBulkDelete={onBulkDelete ? () => onBulkDelete(selectedIds) : undefined}
						bulkDeleteProgress={bulkDeleteProgress}
						onClearSelection={onClearSelection ?? (() => onSelectionChange([]))}
					/>
				</div>

				{drop.over ? (
					<div
						aria-hidden="true"
						className="pointer-events-none absolute inset-2 z-20 grid place-items-center rounded-xl border-2 border-dashed border-primary/50 bg-primary/[0.06] backdrop-blur-[1px] animate-[ai-fade-up_var(--duration-moderate)_var(--ease-out)_both] motion-reduce:animate-none"
					>
						<span className="flex items-center gap-2 rounded-lg bg-card px-3 py-2 text-[13px] font-medium text-foreground shadow-card-lg">
							<UploadCloudIcon className="size-4 text-primary" />
							Drop to upload to {name}
						</span>
					</div>
				) : null}
			</section>
		);
	}

	return (
		<WorkspaceShell
			slot="storage-browser"
			sidebar={sidebar}
			defaultSidebarCollapsed={defaultSidebarCollapsed}
			className={cn('rounded-xl border border-border', className)}
		>
			{view}
		</WorkspaceShell>
	);
}
