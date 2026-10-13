export type DiffLine = { type: 'context' | 'add' | 'del'; text: string };

/** How much work a comparison may do before it settles for a coarser answer. */
export type DiffLimits = {
	/** Largest table (lines before times lines after) the exact comparison fills: 4 bytes a cell. */
	maxCells: number;
	/** Most edits (removed plus added lines) the bounded comparison follows. */
	maxEdits: number;
	/** Most steps (diagonals visited plus lines compared) the bounded comparison takes. */
	maxWork: number;
};

export const DIFF_LIMITS: DiffLimits = { maxCells: 4_000_000, maxEdits: 2_000, maxWork: 8_000_000 };

const context = (text: string): DiffLine => ({ type: 'context', text });
const added = (text: string): DiffLine => ({ type: 'add', text });
const removed = (text: string): DiffLine => ({ type: 'del', text });

/** Longest-common-subsequence diff of two line lists, in order. Cost is the product of the lengths. */
function exactDiff(a: string[], b: string[]): DiffLine[] {
	const cols = b.length + 1;
	// table[i][j] is the length of the longest common subsequence of a[i..] and b[j..].
	const table = new Uint32Array((a.length + 1) * cols);
	for (let i = a.length - 1; i >= 0; i--) {
		for (let j = b.length - 1; j >= 0; j--) {
			table[i * cols + j] = a[i] === b[j] ? table[(i + 1) * cols + j + 1]! + 1 : Math.max(table[(i + 1) * cols + j]!, table[i * cols + j + 1]!);
		}
	}

	const lines: DiffLine[] = [];
	let i = 0;
	let j = 0;
	while (i < a.length && j < b.length) {
		if (a[i] === b[j]) {
			lines.push(context(a[i]!));
			i += 1;
			j += 1;
		} else if (table[(i + 1) * cols + j]! >= table[i * cols + j + 1]!) {
			lines.push(removed(a[i]!));
			i += 1;
		} else {
			lines.push(added(b[j]!));
			j += 1;
		}
	}
	for (; i < a.length; i++) lines.push(removed(a[i]!));
	for (; j < b.length; j++) lines.push(added(b[j]!));
	return lines;
}

/** Within each run of changes, every removal comes before every addition, as the exact comparison writes them. */
function removalsFirst(lines: DiffLine[]): DiffLine[] {
	const ordered: DiffLine[] = [];
	let dropped: DiffLine[] = [];
	let gained: DiffLine[] = [];
	const flush = () => {
		for (const line of dropped) ordered.push(line);
		for (const line of gained) ordered.push(line);
		dropped = [];
		gained = [];
	};
	for (const line of lines) {
		if (line.type === 'context') {
			flush();
			ordered.push(line);
		} else if (line.type === 'del') dropped.push(line);
		else gained.push(line);
	}
	flush();
	return ordered;
}

/**
 * Shortest edit script by Myers' greedy search, which takes time proportional
 * to the lines times the number of edits rather than to the product of the
 * lengths, so a few edits in a long file stay cheap however far apart they are.
 * Gives up (`null`) when more than `maxEdits` edits or `maxWork` steps are needed.
 */
function boundedDiff(a: string[], b: string[], { maxEdits, maxWork }: DiffLimits): DiffLine[] | null {
	const n = a.length;
	const m = b.length;
	const limit = Math.min(n + m, maxEdits);
	const offset = limit + 1;
	// furthest[offset + k] is how far along `a` the best path with the edits so far reaches on diagonal k (x - y).
	const furthest = new Int32Array(2 * limit + 3);
	// trace[d] keeps `furthest` as it was before the d-th round, for diagonals -d..d, to walk the path back.
	const trace: Int32Array[] = [];
	let work = 0;
	for (let d = 0; d <= limit; d++) {
		trace.push(furthest.slice(offset - d, offset + d + 1));
		for (let k = -d; k <= d; k += 2) {
			let x = k === -d || (k !== d && furthest[offset + k - 1]! < furthest[offset + k + 1]!) ? furthest[offset + k + 1]! : furthest[offset + k - 1]! + 1;
			let y = x - k;
			const start = x;
			while (x < n && y < m && a[x] === b[y]) {
				x += 1;
				y += 1;
			}
			work += 1 + x - start;
			furthest[offset + k] = x;
			if (x >= n && y >= m) return removalsFirst(walkBack(a, b, trace, d));
			if (work > maxWork) return null;
		}
	}
	return null;
}

/** The path of a finished search, from the end back to the start, as lines in order. */
function walkBack(a: string[], b: string[], trace: Int32Array[], edits: number): DiffLine[] {
	const lines: DiffLine[] = [];
	let x = a.length;
	let y = b.length;
	for (let d = edits; d >= 0; d--) {
		const before = trace[d]!;
		const k = x - y;
		let fromAbove = false;
		let previousX = 0;
		let previousY = 0;
		if (d > 0) {
			fromAbove = k === -d || (k !== d && before[k - 1 + d]! < before[k + 1 + d]!);
			const previousK = fromAbove ? k + 1 : k - 1;
			previousX = before[previousK + d]!;
			previousY = previousX - previousK;
		}
		while (x > previousX && y > previousY) {
			lines.push(context(a[x - 1]!));
			x -= 1;
			y -= 1;
		}
		if (d > 0) lines.push(fromAbove ? added(b[y - 1]!) : removed(a[x - 1]!));
		x = previousX;
		y = previousY;
	}
	return lines.reverse();
}

/** The part of two line lists between their common head and tail, compared as exactly as `limits` allow. */
function diffMiddle(a: string[], b: string[], limits: DiffLimits): DiffLine[] {
	if (a.length === 0) return b.map(added);
	if (b.length === 0) return a.map(removed);
	if (a.length * b.length <= limits.maxCells) return exactDiff(a, b);
	// Too big for a table: follow the edits instead, and only when even that is too much show the block as removed then added.
	return boundedDiff(a, b, limits) ?? [...a.map(removed), ...b.map(added)];
}

/**
 * Line diff between two line lists, in order: unchanged lines as `context`,
 * removed lines as `del`, new lines as `add`. The common head and tail are
 * trimmed first, so a small edit to a long file stays cheap, and a line that
 * also appears elsewhere is matched by position, so a repeated line is shown as
 * added or removed rather than hidden.
 */
export function diffLines(before: string[], after: string[], limits: DiffLimits = DIFF_LIMITS): DiffLine[] {
	let head = 0;
	while (head < before.length && head < after.length && before[head] === after[head]) head += 1;
	let tailBefore = before.length;
	let tailAfter = after.length;
	while (tailBefore > head && tailAfter > head && before[tailBefore - 1] === after[tailAfter - 1]) {
		tailBefore -= 1;
		tailAfter -= 1;
	}
	return [...before.slice(0, head).map(context), ...diffMiddle(before.slice(head, tailBefore), after.slice(head, tailAfter), limits), ...before.slice(tailBefore).map(context)];
}
