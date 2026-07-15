import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { StorageBrowser } from '../storage-browser';
import { ObjectDetailSheet } from '../object-detail-sheet';
import type { ObjectSort, StorageObject } from '../types';
import { buckets, objects } from './fixtures';

const meta: Meta<typeof StorageBrowser> = {
	title: 'Storage/StorageBrowser',
	component: StorageBrowser,
	parameters: { layout: 'fullscreen' },
	tags: ['autodocs'],
	decorators: [
		(Story) => (
			<div className='h-[640px] w-full p-4'>
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Stateful harness so selection/sort/search/detail interactions work live in
 * the canvas. Mirrors how a host would own this state.
 */
function BrowserHarness(props: { initialEmpty?: 'empty-bucket' | 'no-access' | null; loading?: boolean }) {
	const [selectedBucketId, setSelectedBucketId] = React.useState<string>('bucket-public');
	const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
	const [sort, setSort] = React.useState<ObjectSort>({ column: 'createdAt', direction: 'desc' });
	const [query, setQuery] = React.useState('');
	const [detailObject, setDetailObject] = React.useState<StorageObject | null>(null);

	const visible = objects.filter((object) =>
		query.trim() === '' ? true : (object.filename ?? object.key).toLowerCase().includes(query.toLowerCase()),
	);

	return (
		<>
			<StorageBrowser
				buckets={buckets}
				selectedBucketId={selectedBucketId}
				onSelectBucket={setSelectedBucketId}
				onNewBucket={() => {}}
				objects={visible}
				selectedIds={selectedIds}
				onSelectionChange={setSelectedIds}
				sort={sort}
				onSortChange={setSort}
				query={query}
				onQueryChange={setQuery}
				onOpenObject={setDetailObject}
				onUpload={() => {}}
				onBulkDelete={(ids) => setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)))}
				onClearSelection={() => setSelectedIds([])}
				onDownload={() => {}}
				onCopyLink={() => {}}
				onRename={(object) => setDetailObject(object)}
				onDelete={() => {}}
				isLoading={props.loading}
				emptyState={props.initialEmpty ?? null}
				onEmptyStateAction={() => {}}
				onEmptyStateSecondaryAction={() => {}}
			/>
			<ObjectDetailSheet
				object={detailObject}
				open={detailObject !== null}
				onOpenChange={(open) => !open && setDetailObject(null)}
				onDownload={() => {}}
				onCopyLink={() => {}}
				onRename={() => {}}
				onDelete={() => setDetailObject(null)}
			/>
		</>
	);
}

export const Populated: Story = {
	render: () => <BrowserHarness />,
};

export const Loading: Story = {
	render: () => <BrowserHarness loading />,
};

export const EmptyBucket: Story = {
	render: () => <BrowserHarness initialEmpty='empty-bucket' />,
};

export const NoAccess: Story = {
	render: () => <BrowserHarness initialEmpty='no-access' />,
};

export const WithSelection: Story = {
	render: () => {
		function PreselectedHarness() {
			const [selectedBucketId, setSelectedBucketId] = React.useState<string>('bucket-public');
			const [selectedIds, setSelectedIds] = React.useState<string[]>(['obj-1', 'obj-3', 'obj-5']);
			const [sort, setSort] = React.useState<ObjectSort>({ column: 'filename', direction: 'asc' });
			const [query, setQuery] = React.useState('');

			return (
				<StorageBrowser
					buckets={buckets}
					selectedBucketId={selectedBucketId}
					onSelectBucket={setSelectedBucketId}
					onNewBucket={() => {}}
					objects={objects}
					selectedIds={selectedIds}
					onSelectionChange={setSelectedIds}
					sort={sort}
					onSortChange={setSort}
					query={query}
					onQueryChange={setQuery}
					onUpload={() => {}}
					onBulkDelete={(ids) => setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)))}
					onClearSelection={() => setSelectedIds([])}
				/>
			);
		}
		return <PreselectedHarness />;
	},
};

// In-flight bulk delete: 1 of 3 done, with one failure surfaced in the bar.
export const BulkDeleteInProgress: Story = {
	render: () => {
		function Harness() {
			const [sort, setSort] = React.useState<ObjectSort>({ column: 'filename', direction: 'asc' });
			const [query, setQuery] = React.useState('');
			return (
				<StorageBrowser
					buckets={buckets}
					selectedBucketId='bucket-public'
					onSelectBucket={() => {}}
					objects={objects}
					selectedIds={['obj-1', 'obj-3', 'obj-5']}
					onSelectionChange={() => {}}
					sort={sort}
					onSortChange={setSort}
					query={query}
					onQueryChange={setQuery}
					onUpload={() => {}}
					onBulkDelete={() => {}}
					bulkDeleteProgress={{ done: 1, total: 3, failed: ['obj-3'] }}
					onClearSelection={() => {}}
				/>
			);
		}
		return <Harness />;
	},
};

// Buckets exist but none selected yet → neutral "Select a bucket" prompt (not
// the no-buckets empty state).
export const NoBucketSelected: Story = {
	render: () => {
		function Harness() {
			const [sort, setSort] = React.useState<ObjectSort>({ column: 'createdAt', direction: 'desc' });
			const [query, setQuery] = React.useState('');
			return (
				<StorageBrowser
					buckets={buckets}
					selectedBucketId={null}
					onSelectBucket={() => {}}
					onNewBucket={() => {}}
					objects={[]}
					selectedIds={[]}
					onSelectionChange={() => {}}
					sort={sort}
					onSortChange={setSort}
					query={query}
					onQueryChange={setQuery}
				/>
			);
		}
		return <Harness />;
	},
};

export const FolderView: Story = {
	render: () => {
		function FolderHarness() {
			const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
			const [sort, setSort] = React.useState<ObjectSort>({ column: 'filename', direction: 'asc' });
			const [query, setQuery] = React.useState('');
			return (
				<StorageBrowser
					buckets={buckets}
					selectedBucketId='bucket-public'
					onSelectBucket={() => {}}
					objects={objects.slice(0, 4)}
					selectedIds={selectedIds}
					onSelectionChange={setSelectedIds}
					sort={sort}
					onSortChange={setSort}
					query={query}
					onQueryChange={setQuery}
					segments={[
						{ label: 'images', path: 'images/' },
						{ label: 'banners', path: 'images/banners/' },
					]}
					onNavigate={() => {}}
				/>
			);
		}
		return <FolderHarness />;
	},
};
