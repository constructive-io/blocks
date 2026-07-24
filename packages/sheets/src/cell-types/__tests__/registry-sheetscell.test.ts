import { describe, expect, it } from 'vitest';

import { defineCellType } from '../define-cell-type';
import { createCellTypeRegistry, type CellTypeBuiltins } from '../cell-type-registry';
import type { SheetsCell } from '../../cell-model/sheets-cell';
import type { CellProps } from '../../cell-model/cell-props';
import type { EditorProps } from '../../grid-dom/editors/editor-props';

function sheetsCell(displayData: string): SheetsCell {
	return { kind: 'text', data: displayData, displayData, readonly: false };
}

function makeBuiltins(overrides?: Partial<CellTypeBuiltins>): CellTypeBuiltins {
	return {
		toSheetsCell: (value) => sheetsCell(`builtin:${String(value)}`),
		...overrides,
	};
}

const ctx = {
	metadata: { cellType: 'x', fieldName: 'f', canEdit: true, isReadonly: false, activationBehavior: 'double-click' as const },
};

function TextComponent(_props: CellProps) {
	return null;
}

function TextEditorComponent(_props: EditorProps) {
	return null;
}

describe('createCellTypeRegistry — native SheetsCell + cell component', () => {
	const textDef = defineCellType({
		typeKey: 'text',
		toSheetsCell: (v) => sheetsCell(`def:${String(v)}`),
		cell: TextComponent,
		editorComponent: TextEditorComponent,
	});

	it('toSheetsCell uses the def for a matching typeKey', () => {
		const reg = createCellTypeRegistry([textDef], makeBuiltins());
		expect(reg.toSheetsCell('text', 'hi', ctx)).toMatchObject({ displayData: 'def:hi' });
	});

	it('toSheetsCell falls back to builtins for an unregistered typeKey', () => {
		const reg = createCellTypeRegistry([textDef], makeBuiltins());
		expect(reg.toSheetsCell('number', 7, ctx)).toMatchObject({ displayData: 'builtin:7' });
	});

	it('getCellComponent returns the def component for a matching typeKey', () => {
		const reg = createCellTypeRegistry([textDef], makeBuiltins());
		expect(reg.getCellComponent('text')).toBe(TextComponent);
	});

	it('getCellComponent returns undefined for an unregistered typeKey', () => {
		const reg = createCellTypeRegistry([textDef], makeBuiltins());
		expect(reg.getCellComponent('number')).toBeUndefined();
	});

	it('getEditorComponent returns the def editor for a matching typeKey', () => {
		const reg = createCellTypeRegistry([textDef], makeBuiltins());
		expect(reg.getEditorComponent('text')).toBe(TextEditorComponent);
	});

	it('getEditorComponent returns undefined for an unregistered typeKey', () => {
		const reg = createCellTypeRegistry([textDef], makeBuiltins());
		expect(reg.getEditorComponent('number')).toBeUndefined();
	});
});
