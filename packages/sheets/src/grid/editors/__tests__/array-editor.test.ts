import { describe, expect, it } from 'vitest';

import { mergeArrayEditorValues } from '../array-editor';

describe('array-editor', () => {
	it('commits pending input on save without pressing Add first', () => {
		expect(mergeArrayEditorValues([], 'cold-storage')).toEqual(['cold-storage']);
	});

	it('splits comma and newline separated values', () => {
		expect(mergeArrayEditorValues(['existing'], 'a, b\nc')).toEqual(['existing', 'a', 'b', 'c']);
	});

	it('ignores blank tokens', () => {
		expect(mergeArrayEditorValues([], ' , \n  ')).toEqual([]);
	});
});
