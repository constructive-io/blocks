/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SheetsCell } from '../../../cell-model/sheets-cell';
import type { RelationInfo } from '../../../store/relation-info-slice';
import type { EditorProps } from '../editor-props';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// The reused RelationEditor is hook/network-heavy. Mock every data source so the
// editor lands on a deterministic, persist-capable belongsTo layout with one
// pickable option and ZERO network. A DRAFT row id makes belongsTo short-circuit
// (no parentTable.update): onSaveComplete + onFinishedEditing fire synchronously.

const BELONGS_TO: Record<string, RelationInfo> = {
	author: {
		kind: 'belongsTo',
		relatedTable: 'users',
		displayCandidates: ['name'],
		relationField: 'author',
		foreignKeyField: 'authorId',
	},
};

const OPTION = { id: 'u1', name: 'Alice' };

vi.mock('../../../hooks/use-sheets-meta', () => ({
	useSheetsMeta: () => ({ data: undefined }),
}));
vi.mock('../../../context/sheets-context', () => ({
	useSheetsContext: () => ({ scopeKey: 'test' }),
}));
vi.mock('@tanstack/react-query', () => ({
	useQueryClient: () => ({ invalidateQueries: vi.fn().mockResolvedValue(undefined) }),
}));
vi.mock('../../../hooks/use-sheets-table-cursor', () => ({
	useSheetsTableCursor: () => ({
		data: [OPTION],
		totalCount: 1,
		isLoading: false,
		isFetchingNextPage: false,
		hasNextPage: false,
		fetchNextPage: vi.fn(),
	}),
}));
vi.mock('../../../hooks/use-sheets-table', () => ({
	sheetsTableQueryKeys: { table: () => ['table'] },
	// belongsTo draft path never calls .update; provide a stub anyway.
	useSheetsTable: () => ({ data: [], isLoading: false, update: vi.fn().mockResolvedValue(undefined) }),
}));
vi.mock('../../../store/sheets-store', () => ({
	useSheetsStore: (selector: (s: unknown) => unknown) =>
		selector({
			ensureRelationInfo: vi.fn(),
			relationInfoCache: { posts: BELONGS_TO },
		}),
}));
vi.mock('@constructive-io/ui/toast', () => ({ toast: { error: vi.fn() } }));

import { RelationEditorDom } from '../relation-editor';

function makeProps(value: unknown, over: Partial<EditorProps> = {}): EditorProps {
	const cell: SheetsCell = { kind: 'text', data: value, displayData: '', readonly: false };
	return {
		value,
		cell,
		colKey: 'author',
		rowId: 'draft:abc',
		rowIndex: 0,
		tableName: 'posts',
		relationInfo: BELONGS_TO.author,
		onCommit: vi.fn(),
		onCommitPatch: vi.fn(),
		onCancel: vi.fn(),
		overlay: { maxHeight: 400, flipped: false },
		...over,
	};
}

function findOption(container: HTMLElement, label: string): HTMLElement | undefined {
	const list = container.querySelector('[data-testid="relation-options"]');
	return Array.from(list?.querySelectorAll('[role="button"]') ?? []).find((el) =>
		el.textContent?.includes(label),
	) as HTMLElement | undefined;
}

function findSave(container: HTMLElement): HTMLButtonElement | undefined {
	return Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Save')) as
		| HTMLButtonElement
		| undefined;
}

describe('RelationEditorDom (native EditorProps adapter)', () => {
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
		vi.clearAllMocks();
	});

	it('renders with data-slot and shows the related-table option', async () => {
		await act(async () => {
			root.render(<RelationEditorDom {...makeProps(null)} />);
		});

		expect(container.querySelector('[data-slot="relation-editor"]')).toBeTruthy();
		expect(findOption(container, 'Alice')).toBeTruthy();
	});

	it('pick + Save self-commits a belongsTo patch via onCommitPatch (not onCommit)', async () => {
		const onCommit = vi.fn();
		const onCommitPatch = vi.fn();
		const onCancel = vi.fn();
		await act(async () => {
			root.render(<RelationEditorDom {...makeProps(null, { onCommit, onCommitPatch, onCancel })} />);
		});

		const option = findOption(container, 'Alice');
		expect(option).toBeTruthy();
		await act(async () => {
			option?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		const saveBtn = findSave(container);
		expect(saveBtn).toBeTruthy();
		await act(async () => {
			saveBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		});

		// MULTI-field patch: FK column + display relation field (mirrors the glide factory).
		expect(onCommitPatch).toHaveBeenCalledTimes(1);
		expect(onCommitPatch).toHaveBeenCalledWith({ authorId: 'u1', author: OPTION });
		// Self-committing editor never uses the value-commit path.
		expect(onCommit).not.toHaveBeenCalled();
		// Save also closes the overlay (onFinishedEditing -> onCancel), parity with image.
		expect(onCancel).toHaveBeenCalledTimes(1);
	});

	it('wraps a bare FK string value into { id } for the current selection', async () => {
		await act(async () => {
			root.render(<RelationEditorDom {...makeProps('u1')} />);
		});

		// resolveCurrentValue wraps "u1" -> { id: 'u1' }; the editor renders it as a
		// current relation (id badge shows the first 8 chars of the id).
		const text = container.textContent ?? '';
		expect(text).toContain('u1');
	});

	it('Escape cancels via onFinishedEditing(undefined) and never commits', async () => {
		const onCommit = vi.fn();
		const onCommitPatch = vi.fn();
		const onCancel = vi.fn();
		await act(async () => {
			root.render(<RelationEditorDom {...makeProps(null, { onCommit, onCommitPatch, onCancel })} />);
		});

		// The reused RelationEditor's EditorFocusTrap binds Escape -> handleCancel ->
		// onFinishedEditing() -> onCancel.
		const search = container.querySelector('input') as HTMLInputElement;
		await act(async () => {
			search.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		});

		expect(onCancel).toHaveBeenCalledTimes(1);
		expect(onCommit).not.toHaveBeenCalled();
		expect(onCommitPatch).not.toHaveBeenCalled();
	});
});
