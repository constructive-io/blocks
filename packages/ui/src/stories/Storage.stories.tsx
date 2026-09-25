import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Sheet, SheetContent, SheetDescription, SheetTitle } from '../components/sheet';
import {
	BucketConfigSheet,
	BucketRail,
	FileGlyph,
	ObjectDetailSheet,
	ObjectSelectionBar,
	ObjectStatusBadge,
	ObjectTable,
	ObjectToolbar,
	StorageBreadcrumb,
	StorageBrowser,
	StorageEmptyState,
	UploadDropzone,
	UploadProgressList,
	VisibilityBadge,
	type ObjectSort,
	type StorageBucket,
	type StorageObject,
	type UploadItem,
} from '../components/storage';

const meta: Meta = {
	title: 'UI/StorageBrowser',
	parameters: {
		layout: 'padded',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const BUCKETS: StorageBucket[] = [
	{
		id: 'assets',
		key: 'product-assets',
		name: 'Product assets',
		visibility: 'public',
		isPublic: true,
		allowCustomKeys: true,
		allowedMimeTypes: ['image/png', 'image/jpeg', 'application/pdf'],
		maxFileSize: 25_000_000,
		description: 'Product imagery and shared launch assets.',
		provisioned: true,
		objectCount: 6,
	},
	{
		id: 'exports',
		key: 'customer-exports',
		name: 'Customer exports',
		visibility: 'private',
		isPublic: false,
		allowCustomKeys: false,
		allowedMimeTypes: ['text/csv', 'application/zip'],
		maxFileSize: 100_000_000,
		description: 'Private generated exports.',
		provisioned: true,
		objectCount: 3,
	},
	{
		id: 'scratch',
		key: 'scratch-space',
		visibility: 'temp',
		isPublic: false,
		allowCustomKeys: true,
		description: 'Temporary files for active workflows.',
		provisioned: true,
		objectCount: 0,
	},
	{
		id: 'archive',
		key: 'cold-archive',
		name: 'Cold archive',
		visibility: 'private',
		isPublic: false,
		allowCustomKeys: false,
		provisioned: false,
	},
];

const PREVIEW =
	'data:image/svg+xml;utf8,' +
	encodeURIComponent(
		'<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6366f1"/><stop offset="1" stop-color="#06b6d4"/></linearGradient></defs><rect width="640" height="480" fill="url(#g)"/><circle cx="470" cy="150" r="70" fill="#fff" fill-opacity=".35"/><path d="M0 380 L200 240 L340 340 L460 260 L640 400 L640 480 L0 480Z" fill="#fff" fill-opacity=".25"/></svg>',
	);

const OBJECTS: StorageObject[] = [
	{ id: 'launch-cover', bucketId: 'assets', key: 'launch/cover.png', filename: 'launch-cover.png', mimeType: 'image/png', size: 2_482_132, isPublic: true, status: 'processed', createdAt: '2026-07-25T08:30:00.000Z', updatedAt: '2026-07-27T10:12:00.000Z', downloadUrl: PREVIEW },
	{ id: 'brand-guidelines', bucketId: 'assets', key: 'brand/guidelines.pdf', filename: 'brand-guidelines.pdf', mimeType: 'application/pdf', size: 5_902_450, isPublic: true, status: 'uploaded', createdAt: '2026-07-22T14:45:00.000Z' },
	{ id: 'team-photo', bucketId: 'assets', key: 'people/team-retreat.jpg', filename: 'team-retreat.jpg', mimeType: 'image/jpeg', size: 8_410_004, isPublic: true, status: 'processed', createdAt: '2026-07-18T09:15:00.000Z' },
	{ id: 'release-notes', bucketId: 'assets', key: 'launch/release-notes.md', filename: 'release-notes.md', mimeType: 'text/markdown', size: 18_420, isPublic: true, status: 'uploaded', createdAt: '2026-07-27T06:20:00.000Z' },
	{ id: 'teaser', bucketId: 'assets', key: 'launch/teaser.mp4', filename: 'teaser.mp4', mimeType: 'video/mp4', size: 48_220_004, isPublic: true, status: 'requested', createdAt: '2026-07-27T11:40:00.000Z' },
	{ id: 'pricing', bucketId: 'assets', key: 'pricing.xlsx', filename: 'pricing-2026.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: 94_810, isPublic: true, status: 'processed', createdAt: '2026-07-10T16:02:00.000Z' },
	{ id: 'july-customers', bucketId: 'exports', key: '2026/07/customers.csv', filename: 'customers-july.csv', mimeType: 'text/csv', size: 842_202, isPublic: false, status: 'processed', createdAt: '2026-07-27T05:05:00.000Z' },
	{ id: 'audit-archive', bucketId: 'exports', key: '2026/07/audit-log.zip', filename: 'audit-log.zip', mimeType: 'application/zip', size: 12_734_120, isPublic: false, status: 'processed', createdAt: '2026-07-26T23:15:00.000Z' },
	{ id: 'invoices', bucketId: 'exports', key: '2026/07/invoices.json', filename: 'invoices.json', mimeType: 'application/json', size: 204_118, isPublic: false, status: 'uploaded', createdAt: '2026-07-26T21:00:00.000Z' },
];

function compareObjects(left: StorageObject, right: StorageObject, sort: ObjectSort) {
	let comparison = 0;
	if (sort.column === 'filename') comparison = (left.filename ?? left.key).localeCompare(right.filename ?? right.key);
	else if (sort.column === 'mimeType') comparison = left.mimeType.localeCompare(right.mimeType);
	else if (sort.column === 'size') comparison = left.size - right.size;
	else comparison = Date.parse(left.createdAt) - Date.parse(right.createdAt);
	return sort.direction === 'asc' ? comparison : -comparison;
}

type BrowserProps = React.ComponentProps<typeof StorageBrowser>;

/**
 * A working host: search, sort, selection, the detail sheet, bucket
 * settings, uploads that progress, drag-and-drop, and a bulk delete that
 * reports progress and one failure.
 */
function StorageWorkspaceDemo({ overrides, initialBucket = 'assets' }: { overrides?: Partial<BrowserProps>; initialBucket?: string }) {
	const [objects, setObjects] = React.useState(OBJECTS);
	const [bucketId, setBucketId] = React.useState(initialBucket);
	const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
	const [query, setQuery] = React.useState('');
	const [sort, setSort] = React.useState<ObjectSort>({ column: 'createdAt', direction: 'desc' });
	const [openId, setOpenId] = React.useState<string | null>(null);
	const [config, setConfig] = React.useState<'create' | 'edit' | null>(null);
	const [uploadOpen, setUploadOpen] = React.useState(false);
	const [uploads, setUploads] = React.useState<UploadItem[]>([]);
	const [progress, setProgress] = React.useState<BrowserProps['bulkDeleteProgress']>();

	const buckets = BUCKETS.map((bucket) => ({ ...bucket, objectCount: bucket.provisioned === false ? null : objects.filter((object) => object.bucketId === bucket.id).length }));
	const bucket = buckets.find((candidate) => candidate.id === bucketId);
	const visible = React.useMemo(() => {
		const needle = query.trim().toLowerCase();
		return objects
			.filter((object) => object.bucketId === bucketId && (!needle || `${object.filename} ${object.key} ${object.mimeType}`.toLowerCase().includes(needle)))
			.sort((a, b) => compareObjects(a, b, sort));
	}, [bucketId, objects, query, sort]);

	const startUploads = (files: FileList) => {
		const added = Array.from(files).map((file, index) => ({ id: `${Date.now()}-${index}`, filename: file.name, size: file.size, progress: 0, status: 'uploading' as const }));
		setUploads((current) => [...added, ...current]);
		setUploadOpen(true);
		const timer = window.setInterval(() => {
			setUploads((current) => {
				const next = current.map((item) =>
					item.status === 'uploading' ? { ...item, progress: Math.min(100, item.progress + 17), status: item.progress + 17 >= 100 ? ('done' as const) : item.status } : item,
				);
				if (next.every((item) => item.status !== 'uploading')) window.clearInterval(timer);
				return next;
			});
		}, 350);
	};

	const bulkDelete = (ids: string[]) => {
		let done = 0;
		const failed = ids.slice(-1);
		const step = () => {
			done += 1;
			setProgress({ done, total: ids.length, failed: done === ids.length ? failed : [] });
			if (done < ids.length) window.setTimeout(step, 450);
			else {
				setObjects((current) => current.filter((object) => !ids.slice(0, -1).includes(object.id)));
				setSelectedIds(failed);
			}
		};
		setProgress({ done: 0, total: ids.length, failed: [] });
		window.setTimeout(step, 450);
	};

	const open = objects.find((object) => object.id === openId) ?? null;

	return (
		<>
			<StorageBrowser
				className="h-[620px] w-full max-w-[1080px]"
				buckets={buckets}
				selectedBucketId={bucketId}
				onSelectBucket={(id) => {
					setBucketId(id);
					setSelectedIds([]);
					setQuery('');
					setProgress(undefined);
				}}
				onNewBucket={() => setConfig('create')}
				objects={visible}
				selectedIds={selectedIds}
				onSelectionChange={(ids) => {
					setSelectedIds(ids);
					setProgress(undefined);
				}}
				sort={sort}
				onSortChange={setSort}
				query={query}
				onQueryChange={setQuery}
				onOpenObject={(object) => setOpenId(object.id)}
				onUpload={() => setUploadOpen(true)}
				onDropFiles={startUploads}
				onBulkDelete={bulkDelete}
				bulkDeleteProgress={progress}
				onDownload={() => {}}
				onCopyLink={() => {}}
				onRename={(object) => setOpenId(object.id)}
				onDelete={(object) => setObjects((current) => current.filter((candidate) => candidate.id !== object.id))}
				emptyLabel={query ? `No files match “${query}”` : 'No files'}
				emptyState={bucket?.provisioned === false ? 'not-provisioned' : bucket?.objectCount === 0 ? 'empty-bucket' : null}
				onEmptyStateAction={bucket?.provisioned === false ? () => {} : () => setUploadOpen(true)}
				{...overrides}
			/>
			<ObjectDetailSheet
				object={open}
				open={Boolean(open)}
				onOpenChange={(next) => !next && setOpenId(null)}
				onDownload={() => {}}
				onCopyLink={() => {}}
				onRename={(id, filename) => setObjects((current) => current.map((object) => (object.id === id ? { ...object, filename } : object)))}
				onDelete={(id) => {
					setObjects((current) => current.filter((object) => object.id !== id));
					setOpenId(null);
				}}
			/>
			<BucketConfigSheet
				mode={config ?? 'create'}
				initial={config === 'edit' ? bucket : undefined}
				open={config !== null}
				onOpenChange={(next) => !next && setConfig(null)}
				onSubmit={() => setConfig(null)}
			/>
			<Sheet open={uploadOpen} onOpenChange={setUploadOpen}>
				<SheetContent side="right" className="w-full gap-3 sm:max-w-md">
					<div className="pr-8">
						<SheetTitle className="text-sm font-medium">Upload to {bucket?.name ?? bucket?.key}</SheetTitle>
						<SheetDescription className="text-[13px]">Files keep their names; the bucket&apos;s rules decide what is accepted.</SheetDescription>
					</div>
					<UploadDropzone onFiles={startUploads} uploads={uploads} maxSize={bucket?.maxFileSize} onCancel={(id) => setUploads((current) => current.filter((item) => item.id !== id))} />
				</SheetContent>
			</Sheet>
		</>
	);
}

/** Everything wired: open a file, select a few and delete them (one fails), drop files on the list, or add a bucket. */
export const Default: Story = {
	render: () => <StorageWorkspaceDemo />,
};

/** Inside a folder: the path crumbs navigate back up. */
export const FolderPath: Story = {
	render: () => (
		<StorageWorkspaceDemo
			overrides={{
				segments: [
					{ label: 'launch', path: 'launch/' },
					{ label: 'summer-2026', path: 'launch/summer-2026/' },
				],
				onNavigate: () => {},
			}}
		/>
	),
};

export const Loading: Story = {
	render: () => <StorageWorkspaceDemo overrides={{ isLoading: true }} />,
};

/** A bucket with nothing in it offers the upload. */
export const EmptyBucket: Story = {
	render: () => <StorageWorkspaceDemo initialBucket="scratch" />,
};

/** A bucket that exists in the schema but has no storage behind it yet. */
export const NotProvisioned: Story = {
	render: () => <StorageWorkspaceDemo initialBucket="archive" />,
};

export const NoBuckets: Story = {
	render: () => <StorageWorkspaceDemo overrides={{ buckets: [], selectedBucketId: null, emptyState: 'no-buckets', onEmptyStateAction: () => {} }} />,
};

export const NoAccess: Story = {
	render: () => <StorageWorkspaceDemo overrides={{ emptyState: 'no-access', onEmptyStateSecondaryAction: () => {} }} />,
};

/** The sidebar folds to an icon rail; buckets keep their names as tooltips. */
export const CollapsedSidebar: Story = {
	render: () => <StorageWorkspaceDemo overrides={{ defaultSidebarCollapsed: true }} />,
};

/** Phone width: buckets move into the navigation drawer and columns fold into each row. */
export const Phone: Story = {
	parameters: { layout: 'centered' },
	render: () => (
		<div className="w-[390px]">
			<StorageWorkspaceDemo />
		</div>
	),
};

/* ------------------------------------------------------------------ *
 * Leaves
 * ------------------------------------------------------------------ */

/** Bucket rows with a visibility glyph, counts, a muted unprovisioned bucket, and one loading. */
export const Leaf_BucketRail: Story = {
	name: 'Leaf / BucketRail',
	render: () => {
		const [selected, setSelected] = React.useState('assets');
		return (
			<div className="w-56 rounded-xl bg-sidebar p-2.5 shadow-card">
				<BucketRail buckets={BUCKETS} selectedBucketId={selected} onSelectBucket={setSelected} onNewBucket={() => {}} busyBucketId="exports" />
			</div>
		);
	},
};

/** The table on its own, with selection, sorting, and hover actions. */
export const Leaf_ObjectTable: Story = {
	name: 'Leaf / ObjectTable',
	render: () => {
		const [selected, setSelected] = React.useState<string[]>(['brand-guidelines']);
		const [sort, setSort] = React.useState<ObjectSort>({ column: 'size', direction: 'desc' });
		const rows = OBJECTS.filter((object) => object.bucketId === 'assets').sort((a, b) => compareObjects(a, b, sort));
		return (
			<div className="max-w-3xl">
				<ObjectTable objects={rows} selectedIds={selected} onSelectionChange={setSelected} sort={sort} onSortChange={setSort} onOpenObject={() => {}} onDownload={() => {}} onCopyLink={() => {}} onRename={() => {}} onDelete={() => {}} />
			</div>
		);
	},
};

export const Leaf_ObjectTableLoading: Story = {
	name: 'Leaf / ObjectTable loading',
	render: () => (
		<div className="max-w-3xl">
			<ObjectTable objects={[]} selectedIds={[]} onSelectionChange={() => {}} sort={{ column: 'filename', direction: 'asc' }} onSortChange={() => {}} isLoading />
		</div>
	),
};

/** Search, sort and upload; with a selection it becomes the selection bar. */
export const Leaf_Toolbar: Story = {
	name: 'Leaf / ObjectToolbar and selection bar',
	render: () => {
		const [query, setQuery] = React.useState('');
		const [sort, setSort] = React.useState<ObjectSort>({ column: 'createdAt', direction: 'desc' });
		return (
			<div className="@container/view flex max-w-xl flex-col gap-4">
				<ObjectToolbar query={query} onQueryChange={setQuery} sort={sort} onSortChange={setSort} onUpload={() => {}} />
				<ObjectToolbar query="" onQueryChange={() => {}} sort={sort} onSortChange={setSort} selectedCount={3} onBulkDelete={() => {}} onClearSelection={() => {}} />
				<ObjectSelectionBar floating selectedCount={4} onBulkDelete={() => {}} onClearSelection={() => {}} bulkDeleteProgress={{ done: 2, total: 4, failed: [] }} />
				<ObjectSelectionBar floating selectedCount={1} onBulkDelete={() => {}} onClearSelection={() => {}} bulkDeleteProgress={{ done: 4, total: 4, failed: ['audit-archive'] }} />
			</div>
		);
	},
};

export const Leaf_Breadcrumb: Story = {
	name: 'Leaf / StorageBreadcrumb',
	render: () => (
		<div className="flex max-w-md flex-col gap-3">
			<StorageBreadcrumb bucketKey="Product assets" />
			<StorageBreadcrumb
				bucketKey="Product assets"
				segments={[
					{ label: 'launch', path: 'launch/' },
					{ label: 'summer-2026', path: 'launch/summer-2026/' },
					{ label: 'hero-variants-with-a-long-folder-name', path: 'launch/summer-2026/hero/' },
				]}
				onNavigate={() => {}}
			/>
		</div>
	),
};

/** The drop zone idle, and a list with an active, queued, finished, and failed upload. */
export const Leaf_Uploads: Story = {
	name: 'Leaf / UploadDropzone and progress',
	render: () => (
		<div className="flex max-w-md flex-col gap-4">
			<UploadDropzone onFiles={() => {}} maxSize={25_000_000} />
			<UploadProgressList
				onCancel={() => {}}
				uploads={[
					{ id: '1', filename: 'campaign-banner.png', size: 3_240_880, progress: 68, status: 'uploading' },
					{ id: '2', filename: 'press-kit.zip', size: 48_000_000, progress: 0, status: 'queued' },
					{ id: '3', filename: 'faq.pdf', size: 420_118, progress: 100, status: 'done' },
					{ id: '4', filename: 'raw-footage.mov', size: 1_240_000_000, progress: 12, status: 'error', error: 'Larger than the 25 MB limit for this bucket.' },
				]}
			/>
		</div>
	),
};

/** Image preview from a signed link, plus rename, download, copy link, and a confirmed delete. */
export const Leaf_DetailSheet: Story = {
	name: 'Leaf / ObjectDetailSheet',
	render: () => {
		const [open, setOpen] = React.useState(true);
		return (
			<>
				<button type="button" className="text-sm underline" onClick={() => setOpen(true)}>
					Open detail sheet
				</button>
				<ObjectDetailSheet object={OBJECTS[0]!} open={open} onOpenChange={setOpen} onDownload={() => {}} onCopyLink={() => {}} onRename={() => {}} onDelete={() => {}} />
			</>
		);
	},
};

/** Creating a bucket, with every optional control the schema supports. */
export const Leaf_BucketConfigSheet: Story = {
	name: 'Leaf / BucketConfigSheet',
	render: () => {
		const [open, setOpen] = React.useState(true);
		return (
			<>
				<button type="button" className="text-sm underline" onClick={() => setOpen(true)}>
					Open bucket settings
				</button>
				<BucketConfigSheet mode="edit" initial={BUCKETS[0]} open={open} onOpenChange={setOpen} onSubmit={() => setOpen(false)} />
			</>
		);
	},
};

export const Leaf_EmptyStates: Story = {
	name: 'Leaf / StorageEmptyState',
	render: () => (
		<div className="grid max-w-4xl grid-cols-2 gap-3">
			{(['no-buckets', 'empty-bucket', 'not-provisioned', 'no-access'] as const).map((variant) => (
				<div key={variant} className="rounded-xl bg-card shadow-card">
					<StorageEmptyState variant={variant} onAction={() => {}} onSecondaryAction={() => {}} />
				</div>
			))}
		</div>
	),
};

/** File glyphs by family, and the visibility and status badges. */
export const Leaf_GlyphsAndBadges: Story = {
	name: 'Leaf / Glyphs and badges',
	render: () => (
		<div className="flex flex-col gap-4 text-[13px]">
			<div className="flex flex-wrap gap-4">
				{[
					['Folder', undefined, 'folder'],
					['Image', 'image/png'],
					['Video', 'video/mp4'],
					['Audio', 'audio/mpeg'],
					['PDF', 'application/pdf'],
					['Sheet', 'text/csv'],
					['Archive', 'application/zip'],
					['Text', 'text/markdown'],
					['Other', 'application/octet-stream'],
				].map(([label, mime, kind]) => (
					<span key={label} className="flex items-center gap-2">
						<FileGlyph mimeType={mime} kind={kind as 'folder' | undefined} />
						{label}
					</span>
				))}
			</div>
			<div className="flex flex-wrap gap-2">
				<VisibilityBadge visibility="public" />
				<VisibilityBadge visibility="private" />
				<VisibilityBadge visibility="temp" />
				<ObjectStatusBadge status="requested" />
				<ObjectStatusBadge status="uploaded" />
				<ObjectStatusBadge status="processed" />
			</div>
		</div>
	),
};
