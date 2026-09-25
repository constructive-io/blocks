import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { StorageBrowser, type ObjectSort, type StorageBucket, type StorageObject } from '../src/components/storage';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.PointerEvent ??= MouseEvent as unknown as typeof PointerEvent;

class NoopObserver {
	observe() {}
	unobserve() {}
	disconnect() {}
}

const BUCKETS: StorageBucket[] = [
	{ id: 'assets', key: 'product-assets', name: 'Product assets', visibility: 'public', isPublic: true, allowCustomKeys: true, objectCount: 2 },
	{ id: 'exports', key: 'customer-exports', visibility: 'private', isPublic: false, allowCustomKeys: false, objectCount: 0 },
];

const OBJECTS: StorageObject[] = [
	{ id: 'cover', bucketId: 'assets', key: 'launch/cover.png', filename: 'cover.png', mimeType: 'image/png', size: 2048, isPublic: true, createdAt: '2026-07-25T08:30:00.000Z' },
	{ id: 'guide', bucketId: 'assets', key: 'brand/guide.pdf', filename: 'guide.pdf', mimeType: 'application/pdf', size: 4096, isPublic: true, createdAt: '2026-07-22T08:30:00.000Z' },
];

let root: Root | undefined;
let container: HTMLDivElement | undefined;

beforeEach(() => {
	vi.stubGlobal('ResizeObserver', NoopObserver);
	vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList);
});

afterEach(() => {
	act(() => root?.unmount());
	container?.remove();
	root = undefined;
	vi.unstubAllGlobals();
});

const within = () => container!.querySelector<HTMLElement>('[data-slot="storage-browser"]')!;
const button = (name: RegExp | string) =>
	[...within().querySelectorAll<HTMLButtonElement>('button, [role="checkbox"]')].find((element) => {
		const label = element.getAttribute('aria-label') ?? element.textContent ?? '';
		return typeof name === 'string' ? label.trim() === name : name.test(label);
	});

function Host({ onBulkDelete, onSelectBucket }: { onBulkDelete: (ids: string[]) => void; onSelectBucket: (id: string) => void }) {
	const [bucketId, setBucketId] = React.useState('assets');
	const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
	const [sort, setSort] = React.useState<ObjectSort>({ column: 'filename', direction: 'asc' });
	return (
		<StorageBrowser
			buckets={BUCKETS}
			selectedBucketId={bucketId}
			onSelectBucket={(id) => {
				onSelectBucket(id);
				setBucketId(id);
				setSelectedIds([]);
			}}
			objects={OBJECTS.filter((object) => object.bucketId === bucketId)}
			selectedIds={selectedIds}
			onSelectionChange={setSelectedIds}
			sort={sort}
			onSortChange={setSort}
			query=""
			onQueryChange={() => {}}
			onBulkDelete={onBulkDelete}
			emptyState={bucketId === 'exports' ? 'empty-bucket' : null}
			onUpload={() => {}}
		/>
	);
}

describe('StorageBrowser', () => {
	it('selects files, bulk-deletes from the floating bar, and switches buckets from the sidebar', async () => {
		const onBulkDelete = vi.fn();
		const onSelectBucket = vi.fn();
		container = document.createElement('div');
		document.body.appendChild(container);
		root = createRoot(container);
		await act(async () => root!.render(<Host onBulkDelete={onBulkDelete} onSelectBucket={onSelectBucket} />));

		expect(within().querySelector('h1')?.textContent).toContain('Product assets');
		expect(within().textContent).toContain('2 files');

		await act(async () => button('Select cover.png')!.click());
		await act(async () => button('Select guide.pdf')!.click());
		expect(within().textContent).toContain('2 selected');

		await act(async () => button('Delete')!.click());
		expect(onBulkDelete).toHaveBeenCalledWith(['cover', 'guide']);

		await act(async () => button('Clear selection')!.click());
		expect(within().textContent).not.toContain('2 selected');

		await act(async () => button(/^customer-exports/)!.click());
		expect(onSelectBucket).toHaveBeenCalledWith('exports');
		expect(within().textContent).toContain('This bucket is empty');
	});
});
