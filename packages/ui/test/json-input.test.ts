import { describe, expect, it } from 'vitest';

import { validateJson } from '../src/components/json-input';
import { describeJsonError, findJsonErrorOffset } from '../src/lib/json-error-position';

const valid = [
	'{}',
	'[]',
	'"text"',
	'0',
	'-0.5e+10',
	'true',
	'null',
	'  [1, 2.5, "three", {"four": [null, false]}]  ',
	'{"emoji": "\\ud83e\\udd8a", "escapes": "\\n\\t\\"\\\\\\/", "nested": {"a": {"b": {"c": []}}}}',
	'{\n  "name": "Wiśniewska-Kowalczyk",\n  "email": "a@b.co"\n}',
];

const invalid = [
	'',
	'   ',
	'{"a":1,}',
	'[1,]',
	'[1 2]',
	'{"a"}',
	"{'a': 1}",
	'{"a": 1} trailing',
	'[01]',
	'[1.]',
	'"unterminated',
	'"bad escape \\x"',
	'"short unicode \\u12"',
	'"raw\ncontrol"',
	'tru',
	'{"a": undefined}',
	'[',
	'{"a":',
];

describe('findJsonErrorOffset', () => {
	it.each(valid)('finds no error in %j', (text) => {
		expect(findJsonErrorOffset(text)).toBeNull();
		expect(validateJson(text)).toBeNull();
	});

	it.each(invalid)('locates the error in %j exactly when JSON.parse rejects it', (text) => {
		const offset = findJsonErrorOffset(text);

		expect(validateJson(text)).not.toBeNull();
		expect(offset).not.toBeNull();
		expect(offset!).toBeGreaterThanOrEqual(0);
		expect(offset!).toBeLessThanOrEqual(text.length);
	});

	it('points at the first character that cannot continue the document', () => {
		expect(findJsonErrorOffset('{"a":1,}')).toBe(7);
		expect(findJsonErrorOffset('[1, 2 3]')).toBe(6);
		expect(findJsonErrorOffset('{"a": 1} x')).toBe(9);
	});

	it('reads a long number whole, so the error after it is not blamed on the number', () => {
		const text = `{"a": ${'1'.repeat(70)}, "b": }`;

		expect(findJsonErrorOffset(text)).toBe(text.indexOf('}'));
		expect(findJsonErrorOffset(`{"a": ${'1'.repeat(70)}.${'5'.repeat(70)}e+${'9'.repeat(70)}}`)).toBeNull();
	});

	it('reads a \\u escape wherever it sits in a long string', () => {
		expect(findJsonErrorOffset(`"${'x'.repeat(500)}\\u00e9${'y'.repeat(500)}"`)).toBeNull();
		expect(findJsonErrorOffset('"\\u00e"')).toBe(1);
	});
});

describe('describeJsonError', () => {
	it('adds the line and column of the first error to the engine message', () => {
		const text = '[\n  1,\n  2,\n]';

		expect(describeJsonError(text, 'Unexpected token')).toBe('Unexpected token (line 4, column 1)');
	});

	it('formats large line numbers and keeps the message when the text is valid', () => {
		const text = `[\n${'  1,\n'.repeat(4_499)}  1,\n]`;

		expect(describeJsonError(text, 'Unexpected token')).toBe('Unexpected token (line 4,502, column 1)');
		expect(describeJsonError('{"ok": true}', 'Unexpected token')).toBe('Unexpected token');
	});
});
