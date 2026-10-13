/**
 * Where a JSON text first stops being valid, for an error message a person can act on. Engines word syntax errors
 * differently and often leave out the position (Safari always does), which makes a mistake on line 4,500 hard to find,
 * so the position is found by a small scan of the grammar instead of being read from the engine's message.
 */

// Sticky, so they match at `lastIndex` itself: a number of any length is read whole and nothing is sliced out of the text.
const JSON_NUMBER = /-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/y;
const JSON_HEX_ESCAPE = /[0-9a-fA-F]{4}/y;

/** Where `text` first stops being valid JSON, as a 0-based character offset (null when it parses). */
export const findJsonErrorOffset = (text: string): number | null => {
	let i = 0;
	const fail = (at = i): never => {
		throw new JsonOffsetError(at);
	};
	const whitespace = () => {
		while (i < text.length && ' \n\r\t'.includes(text[i])) i += 1;
	};
	const string = () => {
		i += 1;
		while (i < text.length) {
			const char = text[i];
			if (char === '"') {
				i += 1;
				return;
			}
			if (char === '\\') {
				const escape = text[i + 1];
				if (escape === 'u') {
					JSON_HEX_ESCAPE.lastIndex = i + 2;
					if (!JSON_HEX_ESCAPE.test(text)) fail(i);
					i += 6;
				} else if (escape !== undefined && '"\\/bfnrt'.includes(escape)) i += 2;
				else fail(i + 1);
			} else if (char < ' ') fail(i);
			else i += 1;
		}
		fail(text.length);
	};
	const value = (): void => {
		whitespace();
		const char = text[i];
		if (char === '{') {
			i += 1;
			whitespace();
			if (text[i] === '}') {
				i += 1;
				return;
			}
			for (;;) {
				whitespace();
				if (text[i] !== '"') fail();
				string();
				whitespace();
				if (text[i] !== ':') fail();
				i += 1;
				value();
				whitespace();
				if (text[i] === ',') {
					i += 1;
					continue;
				}
				if (text[i] === '}') {
					i += 1;
					return;
				}
				fail();
			}
		} else if (char === '[') {
			i += 1;
			whitespace();
			if (text[i] === ']') {
				i += 1;
				return;
			}
			for (;;) {
				value();
				whitespace();
				if (text[i] === ',') {
					i += 1;
					continue;
				}
				if (text[i] === ']') {
					i += 1;
					return;
				}
				fail();
			}
		} else if (char === '"') string();
		else if (char === '-' || (char >= '0' && char <= '9')) {
			JSON_NUMBER.lastIndex = i;
			const number = JSON_NUMBER.exec(text);
			if (!number) fail();
			i += number![0].length;
		} else if (text.startsWith('true', i)) i += 4;
		else if (text.startsWith('false', i)) i += 5;
		else if (text.startsWith('null', i)) i += 4;
		else fail();
	};

	try {
		value();
		whitespace();
		if (i < text.length) fail();
		return null;
	} catch (error) {
		return error instanceof JsonOffsetError ? error.offset : null;
	}
};

class JsonOffsetError extends Error {
	constructor(readonly offset: number) {
		super('Invalid JSON');
	}
}

/** The engine's message plus the line and column of the first error ("... (line 4,500, column 3)"). */
export const describeJsonError = (text: string, message: string) => {
	const offset = findJsonErrorOffset(text);
	if (offset === null) return message;
	const before = text.slice(0, offset);
	const line = before.split('\n').length;
	const column = offset - before.lastIndexOf('\n');
	return `${message} (line ${line.toLocaleString('en-US')}, column ${column})`;
};
