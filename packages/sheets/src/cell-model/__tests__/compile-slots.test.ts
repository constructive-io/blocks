import { describe, expect, it } from 'vitest';

import { compileSlots } from '../cell-slots';
import type { CellProps } from '../cell-props';
import type { EditorProps } from '../../grid-dom/editors/editor-props';

function MyCell(_props: CellProps) {
	return null;
}

function MyEditor(_props: EditorProps) {
	return null;
}

describe('compileSlots', () => {
	it('compiles a bare-component slot into one component-only def', () => {
		const defs = compileSlots({ text: MyCell });
		expect(defs).toHaveLength(1);
		expect(defs[0]).toEqual({ typeKey: 'text', cell: MyCell });
	});

	it('compiles the object form { cell } the same way', () => {
		const defs = compileSlots({ json: { cell: MyCell } });
		expect(defs).toHaveLength(1);
		expect(defs[0]).toEqual({ typeKey: 'json', cell: MyCell });
	});

	it('maps the object form { editor } to an editorComponent-only def', () => {
		const defs = compileSlots({ json: { editor: MyEditor } });
		expect(defs).toHaveLength(1);
		expect(defs[0]).toEqual({ typeKey: 'json', cell: undefined, editorComponent: MyEditor });
	});

	it('maps { cell, editor } to a def carrying both overrides', () => {
		const defs = compileSlots({ text: { cell: MyCell, editor: MyEditor } });
		expect(defs).toEqual([{ typeKey: 'text', cell: MyCell, editorComponent: MyEditor }]);
	});

	it('skips entries with neither a cell nor an editor', () => {
		const defs = compileSlots({ json: {}, text: MyCell });
		expect(defs).toEqual([{ typeKey: 'text', cell: MyCell }]);
	});

	it('returns [] for an empty map', () => {
		expect(compileSlots({})).toEqual([]);
	});

	it('returns [] for undefined', () => {
		expect(compileSlots(undefined)).toEqual([]);
	});
});
