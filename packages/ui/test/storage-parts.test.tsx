import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BucketRail, MiddleTruncate, ObjectSelectionBar, UploadProgressList, type StorageBucket, type UploadItem } from '../src/components/storage';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
let container: HTMLDivElement | undefined;

beforeEach(() => {
	vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList);
});

afterEach(() => {
	act(() => root?.unmount());
	container?.remove();
	root = undefined;
	vi.unstubAllGlobals();
});

async function render(node: React.ReactNode) {
	container = document.createElement('div');
	document.body.appendChild(container);
	root = createRoot(container);
	await act(async () => root!.render(node));
}

const upload = (partial: Partial<UploadItem> & Pick<UploadItem, 'id'>): UploadItem => ({ filename: `${partial.id}.png`, size: 1024, progress: 0, status: 'uploading', ...partial });

describe('UploadProgressList', () => {
	it('keeps progress inside 0-100 whatever the host reports', async () => {
		await render(
			<UploadProgressList
				uploads={[upload({ id: 'nan', progress: Number.NaN }), upload({ id: 'negative', progress: -3 }), upload({ id: 'over', progress: 142 }), upload({ id: 'half', progress: 42.4 })]}
			/>,
		);
		const value = (name: string) => container!.querySelector(`[role="progressbar"][aria-label="${name}.png upload"]`)!.getAttribute('aria-valuenow');
		expect([value('nan'), value('negative'), value('over'), value('half')]).toEqual(['0', '0', '100', '42']);
		// The label never prints "NaN%" or a negative percentage.
		expect(container!.textContent).not.toMatch(/NaN|-\d+%/);
		expect(container!.textContent).toContain('100%');
	});

	it('keeps the full failure reason and lets the host dismiss a failed row', async () => {
		const reason = 'The file exceeds the maximum allowed size of 5.0 MB for this bucket (bucket policy: max_file_size = 5242880).';
		const onDismiss = vi.fn();
		await render(<UploadProgressList uploads={[upload({ id: 'big', status: 'error', error: reason }), upload({ id: 'ok' })]} onDismiss={onDismiss} />);

		expect(container!.querySelector(`[title="${reason}"]`)).not.toBeNull();
		// Only failed rows get a dismiss control.
		const dismiss = [...container!.querySelectorAll<HTMLButtonElement>('button')].filter((button) => /Dismiss/.test(button.getAttribute('aria-label') ?? ''));
		expect(dismiss).toHaveLength(1);
		await act(async () => dismiss[0].click());
		expect(onDismiss).toHaveBeenCalledWith('big');
	});
});

describe('MiddleTruncate', () => {
	it('keeps the end of the text visible and the whole text as the tooltip', async () => {
		const name = 'IMG_20250914_183022_HDR_portrait_edited_edited.HEIC';
		await render(<MiddleTruncate text={name} tail={9} />);
		const parts = container!.querySelectorAll('[aria-hidden="true"]');
		expect(container!.querySelector('[title]')?.getAttribute('title')).toBe(name);
		// Assistive tech gets the name in one piece, not split at the cut.
		expect(container!.querySelector('.sr-only')?.textContent).toBe(name);
		expect(parts[0].textContent).toBe(name.slice(0, -9));
		expect(parts[1].textContent).toBe('ited.HEIC');
	});

	it('does not split an emoji', async () => {
		await render(<MiddleTruncate text="holiday-photo-🦊" tail={1} />);
		expect(container!.querySelectorAll('[aria-hidden="true"]')[1].textContent).toBe('🦊');
	});

	it('leaves text that fits in its tail as one ordinary line, readable and selectable once', async () => {
		await render(<MiddleTruncate text="short.txt" />);
		// No hidden halves and no second copy for assistive tech: the text is in the document exactly once.
		expect(container!.querySelectorAll('[aria-hidden="true"]')).toHaveLength(0);
		expect(container!.textContent).toBe('short.txt');
		expect(container!.querySelector('[title]')?.getAttribute('title')).toBe('short.txt');
	});

	it('takes its tooltip from the host: a string replaces it and false leaves it off', async () => {
		await render(<MiddleTruncate text="IMG_20250914_183022_HDR_portrait_edited_edited.HEIC" title="The name, 1.0 MB" />);
		expect(container!.querySelector('[title]')?.getAttribute('title')).toBe('The name, 1.0 MB');
		act(() => root!.render(<MiddleTruncate text="IMG_20250914_183022_HDR_portrait_edited_edited.HEIC" title={false} />));
		expect(container!.querySelector('[title]')).toBeNull();
	});

	it('builds one segmenter and segments each text once, however often it re-renders', async () => {
		const Original = Intl.Segmenter;
		let constructed = 0;
		class Counting extends Original {
			constructor(...args: ConstructorParameters<typeof Intl.Segmenter>) {
				super(...args);
				constructed += 1;
			}
		}
		const segment = vi.spyOn(Original.prototype, 'segment');
		Intl.Segmenter = Counting as typeof Intl.Segmenter;
		try {
			const names = Array.from({ length: 20 }, (_, index) => `customer-feedback-from-enterprise-onboarding-${index}.csv`);
			const rows = () => names.map((name) => <MiddleTruncate key={name} text={name} />);
			await render(<div>{rows()}</div>);
			const afterFirstRender = segment.mock.calls.length;
			act(() => root!.render(<div>{rows()}</div>));
			act(() => root!.render(<div>{rows()}</div>));
			expect(constructed).toBe(0);
			expect(afterFirstRender).toBe(20);
			expect(segment.mock.calls.length).toBe(20);
		} finally {
			Intl.Segmenter = Original;
			segment.mockRestore();
		}
	});
});

describe('BucketRail', () => {
	it('keeps the details in the row tooltip: the truncated name inside adds no tooltip of its own', async () => {
		const bucket: StorageBucket = {
			id: 'b1',
			key: 'customer-feedback-from-enterprise-onboarding-uploads-eu-west-1',
			visibility: 'public',
			isPublic: true,
			allowCustomKeys: false,
			objectCount: 1_284_000,
		};
		await render(<BucketRail buckets={[bucket]} selectedBucketId="b1" onSelectBucket={() => {}} />);
		const titles = [...container!.querySelectorAll('[title]')].map((element) => element.getAttribute('title'));
		expect(titles).toEqual([`${bucket.key}, Public, 1,284,000 files`]);
	});
});

describe('ObjectSelectionBar', () => {
	it('formats counts and follows the host locale', async () => {
		await render(<ObjectSelectionBar selectedCount={1284} onBulkDelete={() => {}} />);
		expect(container!.textContent).toContain('1,284 selected');
		expect(container!.querySelector('[role="status"]')?.textContent).toContain('1,284 files selected.');

		act(() => root!.render(<ObjectSelectionBar selectedCount={1284} locale="de-DE" bulkDeleteProgress={{ done: 412, total: 1284, failed: ['a'] }} onBulkDelete={() => {}} />));
		expect(container!.textContent).toContain('1.284 selected');
		expect(container!.textContent).toContain('Deleting 412/1.284');
	});
});
