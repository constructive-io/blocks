import { describe, expect, it } from 'vitest';

import { copyViewName, MAX_VIEW_NAME_LENGTH } from '../view-names';

const takenIn = (names: string[]) => (name: string) => names.some((taken) => taken.toLowerCase() === name.toLowerCase());

describe('copyViewName', () => {
	it('adds "copy", then a number while the name is taken', () => {
		expect(copyViewName('Open tasks', takenIn([]))).toBe('Open tasks copy');
		expect(copyViewName('Open tasks', takenIn(['open tasks COPY', 'Open tasks copy 2']))).toBe('Open tasks copy 3');
	});

	it('shortens a long name so the copy still fits', () => {
		const long = 'x'.repeat(MAX_VIEW_NAME_LENGTH);
		const first = copyViewName(long, takenIn([]));
		expect(first).toBe(`${'x'.repeat(MAX_VIEW_NAME_LENGTH - ' copy'.length)} copy`);

		const second = copyViewName(long, takenIn([first]));
		expect(second).toBe(`${'x'.repeat(MAX_VIEW_NAME_LENGTH - ' copy 2'.length)} copy 2`);
		expect(second.length).toBe(MAX_VIEW_NAME_LENGTH);
	});

	it('does not end the shortened part with a space', () => {
		const name = `${'a'.repeat(MAX_VIEW_NAME_LENGTH - 6)} bcdef`;
		expect(copyViewName(name, takenIn([]))).toBe(`${'a'.repeat(MAX_VIEW_NAME_LENGTH - 6)} copy`);
	});
});
