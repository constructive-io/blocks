import { describe, expect, it } from 'vitest';

import { mergeArrayEditorValues } from '../array-editor';

describe('array-editor', () => {

	it('adds one item per line and keeps a comma inside an item', () => {
		expect(mergeArrayEditorValues(['existing'], 'Smith, Jane\nc')).toEqual(['existing', 'Smith, Jane', 'c']);
	});

	it('ignores blank lines', () => {
		expect(mergeArrayEditorValues([], ' \n  ')).toEqual([]);
	});
});
