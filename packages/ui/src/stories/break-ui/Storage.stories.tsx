import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { getDataset, pickDataset } from './dataset';
import { emails, identifiers, labels, manyRows, names } from './worst-case';
import {
	BucketConfigSheet,
	BucketRail,
	ObjectDetailSheet,
	ObjectSelectionBar,
	ObjectTable,
	StorageBreadcrumb,
	StorageBrowser,
	StorageEmptyState,
	UploadDropzone,
	UploadProgressList,
	type ObjectSort,
	type StorageBucket,
	type StorageObject,
	type UploadItem,
} from '../../components/storage';

const meta: Meta = {
	title: 'Break UI/Storage',
	parameters: { layout: 'padded', breakUi: { states: ['demo', 'worst', 'empty', 'one', 'huge'] } },
};
export default meta;

/* ------------------------------------------------------------------ *
 * Fixtures: demo values come from the kit's own story; worst values are
 * the longest realistic keys, names, counts and sizes a bucket can hold.
 * ------------------------------------------------------------------ */

const bucket = (partial: Partial<StorageBucket> & Pick<StorageBucket, 'id' | 'key'>): StorageBucket => ({
	visibility: 'private',
	isPublic: false,
	allowCustomKeys: false,
	provisioned: true,
	...partial,
});

const demoBuckets: StorageBucket[] = [
	bucket({ id: 'assets', key: 'product-assets', name: 'Product assets', visibility: 'public', isPublic: true, objectCount: 6 }),
	bucket({ id: 'exports', key: 'customer-exports', name: 'Customer exports', objectCount: 3 }),
	bucket({ id: 'scratch', key: 'scratch-space', visibility: 'temp', objectCount: 0 }),
	bucket({ id: 'archive', key: 'cold-archive', name: 'Cold archive', provisioned: false }),
];

const worstBuckets: StorageBucket[] = [
	bucket({ id: 'w1', key: 'customer-feedback-from-enterprise-onboarding-uploads-eu-west-1', visibility: 'public', isPublic: true, objectCount: 1_284_000 }),
	bucket({ id: 'w2', key: 'q3-board', name: 'Q3 Board Deck — FINAL (revised) v12 [approved by legal] assets', objectCount: 1 }),
	bucket({ id: 'w3', key: 'scratch', name: names.twoLetters, visibility: 'temp', objectCount: 0 }),
	bucket({ id: 'w4', key: 'archive', name: names.rtl, provisioned: false, objectCount: null }),
	bucket({ id: 'w5', key: 'x', name: names.emojiFirst, objectCount: 12_345_678 }),
	// A visibility value the kit does not know about (a schema that grew a new option).
	bucket({ id: 'w6', key: 'quarantine', name: names.vietnamese, visibility: 'quarantine' as StorageBucket['visibility'], objectCount: 7 }),
	...manyRows(24, (index) => bucket({ id: `m${index}`, key: `${identifiers.snakeIdentifier}-${index + 1}`, objectCount: index * 1013 })),
];

const hugeBuckets: StorageBucket[] = manyRows(1000, (index) => bucket({ id: `h${index}`, key: `workspace-backups-${index + 1}`, name: index % 3 ? undefined : `${names.compound} ${index + 1}`, objectCount: index * 37 }));

const KB = 1024;
const TB = KB ** 4;
const object = (partial: Partial<StorageObject> & Pick<StorageObject, 'id' | 'key'>): StorageObject => ({
	bucketId: 'w1',
	filename: partial.key.split('/').pop() ?? partial.key,
	mimeType: 'application/octet-stream',
	size: 1,
	isPublic: false,
	status: 'processed',
	createdAt: '2025-09-14T18:30:22.000Z',
	...partial,
});

const demoObjects: StorageObject[] = [
	object({ id: 'd1', bucketId: 'assets', key: 'launch/cover.png', mimeType: 'image/png', size: 2_482_132, isPublic: true }),
	object({ id: 'd2', bucketId: 'assets', key: 'brand/guidelines.pdf', mimeType: 'application/pdf', size: 5_902_450, isPublic: true, status: 'uploaded' }),
	object({ id: 'd3', bucketId: 'assets', key: 'pricing.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: 94_810, isPublic: true }),
];

const DEEP = 'tenants/9f8e7d6c-5b4a-4c3d-8e2f-1a0b9c8d7e6f/uploads/2025/09/14/exports/customer-feedback-from-enterprise-onboarding/';

// Failures are spread over rows: names, keys, sizes at unit boundaries, odd MIME types, missing fields, bad dates.
const worstObjects: StorageObject[] = [
	object({ id: 'o1', key: `${DEEP}${identifiers.cameraFile}`, filename: identifiers.cameraFile, mimeType: 'image/heic', size: 1_048_575, downloadUrl: '/previews/missing-preview.png' }),
	object({ id: 'o2', key: 'board/q3/deck.pdf', filename: identifiers.fileName, mimeType: 'application/pdf', size: 1.5 * TB, isPublic: true, status: 'uploaded' }),
	object({ id: 'o3', key: 'logs/2025/09/14/api-gateway-access-2025-09-14T18-30-22Z.log.gz', filename: null, mimeType: 'application/gzip', size: 0, status: 'requested' }),
	object({ id: 'o4', key: 'sheets/budget', filename: '', mimeType: 'application/vnd.google-apps.spreadsheet', size: 1024 * KB * KB }),
	object({ id: 'o5', key: 'exports/billing.csv', filename: `${identifiers.snakeIdentifier}.csv`, mimeType: 'text/csv', size: 1, sizeLabel: '2.4 GB (multipart, 3 parts)' }),
	object({ id: 'o6', key: 'docs/report.docx', filename: `${names.cjk}.docx`, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 94_810, createdAt: 'not-a-date' }),
	object({ id: 'o7', key: 'customer-feedback-from-enterprise-onboarding/', filename: 'customer-feedback-from-enterprise-onboarding', kind: 'folder', mimeType: '', size: 0 }),
	object({ id: 'o8', key: 'misc/unknown', filename: names.rtl, mimeType: '', size: Number.NaN, createdAt: '1970-01-01T00:00:00.000Z' }),
	object({ id: 'o9', key: 'dump/disk.img', filename: 'disk.img', mimeType: 'application/octet-stream', size: 5e18 }),
	object({ id: 'o10', key: 'a/1.png', filename: 'IMG_0001.PNG', mimeType: 'image/png', size: 1023 }),
	object({ id: 'o11', key: 'a/2.png', filename: 'IMG_0001.PNG', mimeType: 'image/png', size: 1024 }),
	object({ id: 'o12', key: 'a/3.png', filename: 'IMG_0001.PNG', mimeType: 'image/png', size: 1536 }),
	object({ id: 'o13', key: 'a/audio.m4a', filename: 'audio.m4a', mimeType: 'audio/x-m4a', size: 12_345 }),
];

const hugeObjects: StorageObject[] = manyRows(1000, (index) => ({ ...worstObjects[index % worstObjects.length], id: `h${index}`, key: `${index}/${worstObjects[index % worstObjects.length].key}` }));

const SORT: ObjectSort = { column: 'filename', direction: 'asc' };

/** A path nine folders deep, as a prefix tree: each crumb's path extends the one before it. */
const DEEP_SEGMENTS = [
	'tenants',
	'9f8e7d6c-5b4a-4c3d-8e2f-1a0b9c8d7e6f',
	'uploads',
	'2025',
	'09',
	'14',
	'exports',
	'customer-feedback-from-enterprise-onboarding',
	identifiers.fileName,
].map((label, index, all) => ({ label, path: `${all.slice(0, index + 1).join('/')}/` }));
const noop = () => {};

/* ------------------------------------------------------------------ *
 * Stories
 * ------------------------------------------------------------------ */

/** The whole browser at 1080x620 and at phone width, with every row selected. */
export const Browser: StoryObj = {
	render: (_args, context) => {
		const buckets = pickDataset<StorageBucket[]>(context, { demo: demoBuckets, worst: worstBuckets, empty: [], one: [worstBuckets[0]], huge: hugeBuckets });
		const objects = pickDataset<StorageObject[]>(context, { demo: demoObjects, worst: worstObjects, empty: [], one: [worstObjects[0]], huge: hugeObjects });
		const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
		const [query, setQuery] = React.useState('');
		const [sort, setSort] = React.useState<ObjectSort>(SORT);
		const selectedBucketId = buckets[0]?.id ?? null;
		const view = (
			<StorageBrowser
				className="h-full w-full"
				buckets={buckets}
				selectedBucketId={selectedBucketId}
				onSelectBucket={noop}
				onNewBucket={noop}
				objects={objects}
				selectedIds={selectedIds}
				onSelectionChange={setSelectedIds}
				sort={sort}
				onSortChange={setSort}
				query={query}
				onQueryChange={setQuery}
				onOpenObject={noop}
				onOpenFolder={noop}
				onUpload={noop}
				onBulkDelete={noop}
				onDownload={noop}
				onCopyLink={noop}
				onRename={noop}
				onDelete={noop}
				segments={DEEP_SEGMENTS}
				onNavigate={noop}
				emptyState={buckets.length === 0 ? 'no-buckets' : objects.length === 0 ? 'empty-bucket' : null}
				title={buckets.length > 0 ? 'Northwind Industries Holdings (EMEA) — Platform Infrastructure' : undefined}
			/>
		);
		return (
			<div className="flex flex-col gap-8">
				<div style={{ width: 1080, height: 620, maxWidth: '100%' }} data-testid="browser-wide">
					{view}
				</div>
				<button type="button" className="w-fit text-xs underline" onClick={() => setSelectedIds(objects.map((candidate) => candidate.id))} data-testid="select-all">
					Select every row
				</button>
			</div>
		);
	},
};

/** The bucket list in its real 224px rail (inside the sidebar frame width), and collapsed to the 52px rail. */
export const BucketRailStress: StoryObj = {
	name: 'BucketRail',
	render: (_args, context) => {
		const buckets = pickDataset<StorageBucket[]>(context, { demo: demoBuckets, worst: worstBuckets, empty: [], one: [worstBuckets[0]], huge: hugeBuckets });
		return (
			<div className="flex items-start gap-6">
				<div className="h-[520px] w-56 overflow-y-auto rounded-xl bg-sidebar p-2.5 shadow-card" data-testid="rail">
					<BucketRail buckets={buckets} selectedBucketId={buckets[1]?.id} onSelectBucket={noop} onNewBucket={noop} busyBucketId={buckets[2]?.id} />
				</div>
				<div className="h-[520px] w-[52px] overflow-y-auto rounded-xl bg-sidebar p-2 shadow-card" data-testid="rail-collapsed">
					<BucketRail buckets={buckets} selectedBucketId={buckets[1]?.id} onSelectBucket={noop} onNewBucket={noop} collapsed />
				</div>
			</div>
		);
	},
};

/** The table in a 560px container (columns fold) and at 1080px (every column shows). */
export const ObjectTableStress: StoryObj = {
	name: 'ObjectTable',
	render: (_args, context) => {
		const objects = pickDataset<StorageObject[]>(context, { demo: demoObjects, worst: worstObjects, empty: [], one: [worstObjects[0]], huge: hugeObjects });
		const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
		const [sort, setSort] = React.useState<ObjectSort>(SORT);
		const table = (
			<ObjectTable
				objects={objects}
				selectedIds={selectedIds}
				onSelectionChange={setSelectedIds}
				sort={sort}
				onSortChange={setSort}
				onOpenObject={noop}
				onOpenFolder={noop}
				onDownload={noop}
				onCopyLink={noop}
				onRename={noop}
				onDelete={noop}
			/>
		);
		return (
			<div className="flex flex-col gap-8">
				<div style={{ width: 560, maxWidth: '100%' }} data-testid="table-narrow">
					{table}
				</div>
				{/* One table is enough to judge 1,000 rows; two would double an already heavy page. */}
				{getDataset(context) === 'huge' ? null : (
					<div style={{ width: 1080, maxWidth: '100%' }} data-testid="table-wide">
						{table}
					</div>
				)}
			</div>
		);
	},
};

const worstUploads: UploadItem[] = [
	{ id: 'u1', filename: identifiers.cameraFile, size: 4_800_000_000, progress: 42.4, status: 'uploading' },
	{ id: 'u2', filename: identifiers.fileName, size: 12_345, progress: 0, status: 'queued' },
	{ id: 'u3', filename: 'x.png', size: 1, progress: 142, status: 'uploading' },
	{ id: 'u4', filename: `${identifiers.snakeIdentifier}.csv`, size: 0, progress: Number.NaN, status: 'uploading' },
	{
		id: 'u5',
		filename: `${names.cjk}.pdf`,
		size: 9_437_184,
		progress: 100,
		status: 'error',
		error: 'The file exceeds the maximum allowed size of 5.0 MB for this bucket (bucket policy: max_file_size = 5242880). Reduce the file size or ask a bucket admin to raise the limit.',
	},
	{ id: 'u6', filename: emails.long + '.eml', size: 1_048_575, progress: -3, status: 'uploading' },
	{ id: 'u7', filename: 'done.pdf', size: 420_118, progress: 100, status: 'done' },
];

const demoUploads: UploadItem[] = [
	{ id: 'u1', filename: 'campaign-banner.png', size: 3_240_880, progress: 68, status: 'uploading' },
	{ id: 'u2', filename: 'press-kit.zip', size: 48_000_000, progress: 0, status: 'queued' },
	{ id: 'u3', filename: 'faq.pdf', size: 420_118, progress: 100, status: 'done' },
];

/** The drop zone and its progress list in a 448px sheet body, and in a 280px column. */
export const UploadStress: StoryObj = {
	name: 'UploadDropzone',
	render: (_args, context) => {
		const uploads = pickDataset<UploadItem[]>(context, {
			demo: demoUploads,
			worst: worstUploads,
			empty: [],
			one: [worstUploads[0]],
			huge: manyRows(200, (index) => ({ ...worstUploads[index % worstUploads.length], id: `h${index}` })),
		});
		const dropzone = (maxSize: number | null) => <UploadDropzone onFiles={noop} onCancel={noop} uploads={uploads} maxSize={maxSize} />;
		return (
			<div className="flex flex-wrap items-start gap-8">
				<div style={{ width: 416, maxWidth: '100%' }} data-testid="upload-sheet">
					{dropzone(5_497_558_138_880)}
				</div>
				<div style={{ width: 280, maxWidth: '100%' }} data-testid="upload-narrow">
					<UploadProgressList uploads={uploads} onCancel={noop} />
				</div>
			</div>
		);
	},
};

/** The detail sheet for the camera upload, open on load; `Reopen` brings it back after a close. */
export const DetailSheet: StoryObj = {
	name: 'ObjectDetailSheet',
	parameters: { layout: 'padded', breakUi: { states: ['demo', 'worst'] } },
	render: (_args, context) => {
		const subject = pickDataset<StorageObject>(context, { demo: demoObjects[0], worst: worstObjects[0] });
		const [open, setOpen] = React.useState(false);
		return (
			<>
				<button type="button" data-testid="open-detail" className="text-sm underline" onClick={() => setOpen(true)}>
					Open detail sheet
				</button>
				<ObjectDetailSheet object={subject} open={open} onOpenChange={setOpen} onDownload={noop} onCopyLink={noop} onRename={noop} onDelete={noop} />
			</>
		);
	},
};

const mimeTypes = [
	'image/png',
	'image/jpeg',
	'image/heic',
	'application/pdf',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	'application/vnd.openxmlformats-officedocument.presentationml.presentation',
	'application/vnd.oasis.opendocument.text',
	'application/x-7z-compressed',
	'video/quicktime',
];
const origins = [
	'https://example.com',
	'https://customer-feedback-from-enterprise-onboarding.northwind-industries-holdings.example.com',
	'https://sub.department.region.example.co.uk',
	'http://localhost:3000',
	'https://*.example.org',
];

/** Editing a bucket: long key, many long chips, a huge size limit, and a long description. */
export const BucketConfig: StoryObj = {
	name: 'BucketConfigSheet',
	parameters: { layout: 'padded', breakUi: { states: ['demo', 'worst'] } },
	render: (_args, context) => {
		const initial = pickDataset<Partial<StorageBucket>>(context, {
			demo: { ...demoBuckets[0], allowedMimeTypes: ['image/png'], allowedOrigins: ['https://example.com'], maxFileSize: 25_000_000, description: 'Product imagery.' },
			worst: {
				...worstBuckets[0],
				allowedMimeTypes: [...mimeTypes, ...mimeTypes.map((type) => `${type}; charset=utf-8`)],
				allowedOrigins: [...origins, ...origins.map((origin) => `${origin}/app`)],
				maxFileSize: 5_497_558_138_880,
				description: labels.longDescription.repeat(3),
			},
		});
		const [open, setOpen] = React.useState(false);
		return (
			<>
				<button type="button" data-testid="open-config" className="text-sm underline" onClick={() => setOpen(true)}>
					Open bucket settings
				</button>
				<BucketConfigSheet mode="edit" initial={initial} open={open} onOpenChange={setOpen} onSubmit={() => setOpen(false)} />
			</>
		);
	},
};

/** Breadcrumb with a deep path, the selection bar at 1,284 selected, and the four empty states. */
export const SmallParts: StoryObj = {
	name: 'Breadcrumb, selection bar, empty states',
	parameters: { layout: 'padded', breakUi: { states: ['demo', 'worst'] } },
	render: (_args, context) => {
		const worst = pickDataset(context, { demo: false, worst: true });
		const segments = worst ? DEEP_SEGMENTS : [{ label: 'launch', path: 'launch/' }];
		return (
			<div className="flex flex-col gap-8">
				<div style={{ width: 480, maxWidth: '100%' }} data-testid="breadcrumb">
					<StorageBreadcrumb bucketKey={worst ? worstBuckets[0].key : 'Product assets'} segments={segments} onNavigate={noop} />
				</div>
				<div style={{ width: 320, maxWidth: '100%' }} className="@container/view" data-testid="selection">
					<ObjectSelectionBar
						floating
						selectedCount={worst ? 1284 : 3}
						onBulkDelete={noop}
						onClearSelection={noop}
						bulkDeleteProgress={worst ? { done: 412, total: 1284, failed: manyRows(17, (index) => `f${index}`) } : undefined}
					/>
				</div>
				<div className="grid gap-4 sm:grid-cols-2">
					{(['no-buckets', 'not-provisioned', 'empty-bucket', 'no-access'] as const).map((variant) => (
						<div key={variant} className="rounded-xl border" style={{ width: 280, maxWidth: '100%' }}>
							<StorageEmptyState variant={variant} onAction={noop} onSecondaryAction={noop} />
						</div>
					))}
				</div>
			</div>
		);
	},
};
