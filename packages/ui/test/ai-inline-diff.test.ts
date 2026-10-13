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

	describe('in a file too long for an exact comparison', () => {
		const lines = (count: number) => Array.from({ length: count }, (_, index) => `const value${index} = ${index};`);
		const changed = (diff: ReturnType<typeof lineDiff>) => diff.filter((line) => line.type !== 'context');
		const rebuilds = (diff: ReturnType<typeof lineDiff>, before: string, after: string) => {
			expect(diff.filter((line) => line.type !== 'add').map((line) => line.text).join('\n')).toBe(before);
			expect(diff.filter((line) => line.type !== 'del').map((line) => line.text).join('\n')).toBe(after);
		};

		it('shows two distant one-line edits as two small hunks, not as a rewrite', () => {
			const file = lines(3000);
			const edited = [...file];
			edited[100] = 'const value100 = 1000; // changed';
			edited[2900] = 'const value2900 = 2900000; // changed';
			const diff = lineDiff(file.join('\n'), edited.join('\n'));
			expect(summary(changed(diff))).toEqual(['-const value100 = 100;', '+const value100 = 1000; // changed', '-const value2900 = 2900;', '+const value2900 = 2900000; // changed']);
			expect(diff.filter((line) => line.type === 'context')).toHaveLength(2998);
			rebuilds(diff, file.join('\n'), edited.join('\n'));
		});

		it('keeps lines that repeat in the unchanged middle matched', () => {
			const middle = Array.from({ length: 2600 }, (_, index) => (index % 3 === 0 ? '' : 'same'));
			const before = ['HEAD-A', ...middle, 'TAIL-A'].join('\n');
			const after = ['HEAD-B', ...middle, 'TAIL-B'].join('\n');
			const diff = lineDiff(before, after);
			expect(summary(changed(diff))).toEqual(['-HEAD-A', '+HEAD-B', '-TAIL-A', '+TAIL-B']);
			rebuilds(diff, before, after);
		});

		it('finds scattered edits and an inserted block across thousands of lines', () => {
			const file = lines(5000);
			const edited = file.map((line, index) => (index % 100 === 50 ? `${line} // edited` : line));
			edited.splice(2500, 0, ...lines(30).map((line) => `inserted ${line}`));
			const diff = lineDiff(file.join('\n'), edited.join('\n'));
			// 50 edited lines (a removal and an addition each) plus 30 new lines.
			expect(changed(diff)).toHaveLength(50 * 2 + 30);
			rebuilds(diff, file.join('\n'), edited.join('\n'));
		});

		it('falls back to removed-then-added when almost every line differs, and returns promptly', () => {
			const before = lines(3000).join('\n');
			const after = lines(3000).map((line) => `new ${line}`).join('\n');
			const started = performance.now();
			const diff = lineDiff(before, after);
			expect(performance.now() - started).toBeLessThan(2000);
			expect(diff).toHaveLength(6000);
			expect(diff.slice(0, 3000).every((line) => line.type === 'del')).toBe(true);
			expect(diff.slice(3000).every((line) => line.type === 'add')).toBe(true);
		});
	});
});
