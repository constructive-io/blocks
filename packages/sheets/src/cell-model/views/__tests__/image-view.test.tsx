/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { CellProps } from '../../cell-props';
import type { SheetsCell } from '../../sheets-cell';
import { ImageCellView } from '../image-view';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// The image factory puts the resolved url in a single-element array (`[url]`),
// collapsing empty/null/'' to `['']`. The view reads data[0].
function makeProps(url: string): CellProps {
	const cell: SheetsCell = {
		kind: 'image',
		data: [url],
		displayData: JSON.stringify([url]),
		readonly: false,
	};
	return {
		cell,
		value: url,
		colKey: 'avatar',
		rowId: 'row-1',
		rowIndex: 0,
		column: { key: 'avatar', name: 'Avatar', cellType: 'image' },
		isEditing: false,
		onStartEdit: () => {},
		disabled: false,
	};
}

// A media value with rich metadata ({ url, mime, filename }) on a given column type —
// used to exercise the type-aware file-chip vs thumbnail branch.
function makeFileProps(value: unknown, cellType: string): CellProps {
	const url =
		typeof value === 'string'
			? value
			: value && typeof value === 'object' && 'url' in value
				? String((value as { url?: unknown }).url ?? '')
				: '';
	const cell: SheetsCell = { kind: 'image', data: [url], displayData: JSON.stringify([url]), readonly: false };
	return {
		cell,
		value,
		colKey: 'attachment',
		rowId: 'row-1',
		rowIndex: 0,
		column: { key: 'attachment', name: 'Attachment', cellType: cellType as CellProps['column']['cellType'] },
		isEditing: false,
		onStartEdit: () => {},
		disabled: false,
	};
}

describe('ImageCellView', () => {
	let root: Root;
	let container: HTMLDivElement;

	beforeEach(() => {
		container = document.createElement('div');
		document.body.appendChild(container);
		root = createRoot(container);
	});

	afterEach(async () => {
		await act(async () => {
			root.unmount();
		});
		container.remove();
	});

	function render(props: CellProps) {
		act(() => {
			root.render(<ImageCellView {...props} />);
		});
	}

	it('renders the slot wrapper', () => {
		render(makeProps('https://example.com/a.png'));
		expect(container.querySelector('[data-slot="image-cell"]')).not.toBeNull();
	});

	it('non-empty url -> eager async-decode <img> with cover + rounded classes', () => {
		render(makeProps('https://example.com/a.png'));
		const img = container.querySelector('img');
		expect(img).not.toBeNull();
		expect(img!.getAttribute('src')).toBe('https://example.com/a.png');
		// No loading="lazy": in a virtualized scroller it forces a fetch-after-mount on
		// every remount (pop-in). Eager + async decode keeps scroll-back paints warm.
		expect(img!.getAttribute('loading')).toBeNull();
		expect(img!.getAttribute('decoding')).toBe('async');
		expect(img!.className).toContain('object-cover');
		expect(img!.className).not.toContain('object-contain');
		expect(img!.className).toContain('rounded-sm');
	});

	it('empty url -> muted placeholder, no <img>', () => {
		render(makeProps(''));
		expect(container.querySelector('img')).toBeNull();
		const placeholder = container.querySelector('[data-slot="image-cell"] > div');
		expect(placeholder).not.toBeNull();
		expect(placeholder!.className).toContain('bg-muted');
		expect(placeholder!.className).toContain('aspect-square');
	});

	it('placeholder box backs the image (square + rounded) when a url is present', () => {
		render(makeProps('https://example.com/a.png'));
		const box = container.querySelector('[data-slot="image-cell"] > div');
		expect(box).not.toBeNull();
		expect(box!.className).toContain('aspect-square');
		expect(box!.className).toContain('bg-muted');
		expect(box!.className).toContain('rounded-sm');
	});

	it('non-image file value on a non-image column -> file chip, no <img>', () => {
		render(
			makeFileProps(
				{ url: 'https://example.com/report.pdf', mime: 'application/pdf', filename: 'report.pdf' },
				'upload',
			),
		);
		expect(container.querySelector('[data-slot="file-cell"]')).not.toBeNull();
		expect(container.querySelector('img')).toBeNull();
		expect(container.textContent).toContain('report.pdf');
	});

	it('image-mime value on a non-image column -> thumbnail (image path preserved)', () => {
		render(
			makeFileProps({ url: 'https://example.com/photo.png', mime: 'image/png', filename: 'photo.png' }, 'upload'),
		);
		expect(container.querySelector('[data-slot="image-cell"]')).not.toBeNull();
		expect(container.querySelector('img')).not.toBeNull();
	});

	it('image column always renders a thumbnail regardless of mime', () => {
		render(makeFileProps({ url: 'https://example.com/x.bin', mime: 'application/pdf' }, 'image'));
		expect(container.querySelector('[data-slot="image-cell"]')).not.toBeNull();
		expect(container.querySelector('[data-slot="file-cell"]')).toBeNull();
	});

	it('bare-string url (no metadata) on a non-image column -> file chip with basename', () => {
		// Mirrors the editor: without a known image mime we chip rather than risk a broken <img>.
		render(makeFileProps('https://example.com/files/report.pdf', 'upload'));
		expect(container.querySelector('[data-slot="file-cell"]')).not.toBeNull();
		expect(container.querySelector('img')).toBeNull();
		expect(container.textContent).toContain('report.pdf');
	});
});
