import { useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import {
	StorageBrowser,
	type ObjectSort,
	type StorageBucket,
	type StorageObject,
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
		visibility: 'public',
		isPublic: true,
		allowCustomKeys: true,
		allowedMimeTypes: ['image/png', 'image/jpeg', 'application/pdf'],
		maxFileSize: 25_000_000,
		description: 'Product imagery and shared launch assets.',
		provisioned: true,
		objectCount: 4,
	},
	{
		id: 'exports',
		key: 'customer-exports',
		visibility: 'private',
		isPublic: false,
		allowCustomKeys: false,
		allowedMimeTypes: ['text/csv', 'application/zip'],
		maxFileSize: 100_000_000,
		description: 'Private generated exports.',
		provisioned: true,
		objectCount: 2,
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
];

const OBJECTS: StorageObject[] = [
	{
		id: 'launch-cover',
		bucketId: 'assets',
		key: 'launch/cover.png',
		filename: 'launch-cover.png',
		mimeType: 'image/png',
		size: 2_482_132,
		isPublic: true,
		status: 'processed',
		createdAt: '2026-07-25T08:30:00.000Z',
		updatedAt: '2026-07-27T10:12:00.000Z',
	},
	{
		id: 'brand-guidelines',
		bucketId: 'assets',
		key: 'brand/guidelines.pdf',
		filename: 'brand-guidelines.pdf',
		mimeType: 'application/pdf',
		size: 5_902_450,
		isPublic: true,
		status: 'uploaded',
		createdAt: '2026-07-22T14:45:00.000Z',
	},
	{
		id: 'team-photo',
		bucketId: 'assets',
		key: 'people/team-retreat.jpg',
		filename: 'team-retreat.jpg',
		mimeType: 'image/jpeg',
		size: 8_410_004,
		isPublic: true,
		status: 'processed',
		createdAt: '2026-07-18T09:15:00.000Z',
	},
	{
		id: 'release-notes',
		bucketId: 'assets',
		key: 'launch/release-notes.md',
		filename: 'release-notes.md',
		mimeType: 'text/markdown',
		size: 18_420,
		isPublic: true,
		status: 'uploaded',
		createdAt: '2026-07-27T06:20:00.000Z',
	},
	{
		id: 'july-customers',
		bucketId: 'exports',
		key: '2026/07/customers.csv',
		filename: 'customers-july.csv',
		mimeType: 'text/csv',
		size: 842_202,
		isPublic: false,
		status: 'processed',
		createdAt: '2026-07-27T05:05:00.000Z',
	},
	{
		id: 'audit-archive',
		bucketId: 'exports',
		key: '2026/07/audit-log.zip',
		filename: 'audit-log.zip',
		mimeType: 'application/zip',
		size: 12_734_120,
		isPublic: false,
		status: 'processed',
		createdAt: '2026-07-26T23:15:00.000Z',
	},
];

function compareObjects(left: StorageObject, right: StorageObject, sort: ObjectSort) {
	let comparison = 0;
	if (sort.column === 'filename') {
		comparison = (left.filename ?? left.key).localeCompare(right.filename ?? right.key);
	} else if (sort.column === 'mimeType') {
		comparison = left.mimeType.localeCompare(right.mimeType);
	} else if (sort.column === 'size') {
		comparison = left.size - right.size;
	} else {
		comparison = new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
	}
	return sort.direction === 'asc' ? comparison : -comparison;
}

function StorageBrowserDemo() {
	const [selectedBucketId, setSelectedBucketId] = useState('assets');
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [query, setQuery] = useState('');
	const [sort, setSort] = useState<ObjectSort>({ column: 'createdAt', direction: 'desc' });

	const visibleObjects = useMemo(() => {
		const normalized = query.trim().toLowerCase();
		return OBJECTS.filter((object) => {
			if (object.bucketId !== selectedBucketId) return false;
			if (normalized === '') return true;
			return `${object.filename ?? ''} ${object.key} ${object.mimeType}`
				.toLowerCase()
				.includes(normalized);
		}).sort((a, b) => compareObjects(a, b, sort));
	}, [query, selectedBucketId, sort]);

	const activeBucket = BUCKETS.find((bucket) => bucket.id === selectedBucketId);

	return (
		<StorageBrowser
			className='h-[560px] w-[860px]'
			buckets={BUCKETS}
			objects={visibleObjects}
			query={query}
			selectedBucketId={selectedBucketId}
			selectedIds={selectedIds}
			sort={sort}
			emptyLabel={query ? 'No files match this search' : 'No files'}
			emptyState={activeBucket?.objectCount === 0 ? 'empty-bucket' : null}
			onBulkDelete={() => {}}
			onClearSelection={() => setSelectedIds([])}
			onCopyLink={() => {}}
			onDelete={() => {}}
			onDownload={() => {}}
			onEmptyStateAction={() => {}}
			onNewBucket={() => {}}
			onOpenObject={() => {}}
			onQueryChange={setQuery}
			onRename={() => {}}
			onSelectBucket={(id) => {
				setSelectedBucketId(id);
				setSelectedIds([]);
				setQuery('');
			}}
			onSelectionChange={setSelectedIds}
			onSortChange={setSort}
			onUpload={() => {}}
		/>
	);
}

export const Default: Story = {
	render: () => <StorageBrowserDemo />,
};
