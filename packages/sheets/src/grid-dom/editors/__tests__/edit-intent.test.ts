import { describe, expect, it } from 'vitest';

import type { CellType } from '../../../cell-types/types';
import { DOM_EDITOR_REGISTRY, type NativeEditor } from '../editor-registry-dom';
import { resolveEditIntent } from '../edit-intent';

describe('resolveEditIntent', () => {
	it('routes representative cell families to their observable editing modes', () => {
		const cases: Array<[CellType, ReturnType<typeof resolveEditIntent>]> = [
			['boolean', { mode: 'inline-toggle' }],
			['integer', { mode: 'inline-edit' }],
			['text', { mode: 'inline-edit' }],
			['date', { mode: 'overlay', editor: DOM_EDITOR_REGISTRY.date }],
			['text-array', { mode: 'overlay', editor: DOM_EDITOR_REGISTRY.array }],
			['geometry-point', { mode: 'overlay', editor: DOM_EDITOR_REGISTRY.geometry }],
			['upload', { mode: 'overlay', editor: DOM_EDITOR_REGISTRY.image }],
			['relation', { mode: 'overlay', editor: DOM_EDITOR_REGISTRY.relation }],
			['url', { mode: 'overlay', editor: DOM_EDITOR_REGISTRY.url }],
			['tsvector', { mode: 'overlay', editor: DOM_EDITOR_REGISTRY.tsvector }],
		];

		for (const [cellType, expected] of cases) {
			expect(resolveEditIntent(cellType, {}), cellType).toEqual(expected);
		}
	});

	it('lets readonly state override every editing route', () => {
		for (const cellType of ['boolean', 'text', 'relation'] as CellType[]) {
			expect(resolveEditIntent(cellType, { readonly: true })).toEqual({ mode: 'none' });
		}
	});

	it('uses consumer editors only for editable inline cells', () => {
		const Custom = (() => null) as unknown as NativeEditor;

		expect(resolveEditIntent('text', {}, () => Custom)).toEqual({ mode: 'overlay', editor: Custom });
		expect(resolveEditIntent('boolean', {}, () => Custom)).toEqual({ mode: 'inline-toggle' });
		expect(resolveEditIntent('text', { readonly: true }, () => Custom)).toEqual({ mode: 'none' });
	});
});
