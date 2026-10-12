import { describe, expect, it } from 'vitest';

import { lineDiff } from '../src/components/ai/inline-diff';

const summary = (lines: ReturnType<typeof lineDiff>) => lines.map((line) => `${line.type === 'add' ? '+' : line.type === 'del' ? '-' : ' '}${line.text}`);

describe('lineDiff', () => {
	it('shows a line that also exists elsewhere as added, not as unchanged', () => {
		const before = 'if (x) {\n  foo();\n}';
		const after = 'if (x) {\n  foo();\n  foo();\n}';
		expect(summary(lineDiff(before, after))).toEqual([' if (x) {', '   foo();', '+  foo();', ' }']);
	});

	it('reports a removed duplicate as removed', () => {
		expect(summary(lineDiff('a\nb\nb\nc', 'a\nb\nc'))).toEqual([' a', ' b', '-b', ' c']);
	});

	it('keeps every line in order around a replaced block', () => {
		const lines = summary(lineDiff('one\ntwo\nthree\nfour', 'one\n2\n2b\nfour'));
		expect(lines).toEqual([' one', '-two', '-three', '+2', '+2b', ' four']);
	});

	it('treats identical text as all unchanged and a blank line as a line', () => {
		expect(lineDiff('a\n\nb', 'a\n\nb').every((line) => line.type === 'context')).toBe(true);
		expect(summary(lineDiff('a\nb', 'a\n\nb'))).toEqual([' a', '+', ' b']);
	});

	it('reconstructs both sides from the diff', () => {
		const before = ['alpha', 'beta', 'gamma', 'beta', 'delta', 'epsilon'].join('\n');
		const after = ['alpha', 'gamma', 'beta', 'delta', 'beta', 'zeta'].join('\n');
		const lines = lineDiff(before, after);
		expect(lines.filter((line) => line.type !== 'add').map((line) => line.text).join('\n')).toBe(before);
		expect(lines.filter((line) => line.type !== 'del').map((line) => line.text).join('\n')).toBe(after);
	});
});
