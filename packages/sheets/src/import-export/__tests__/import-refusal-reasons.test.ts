// The reasons an import shows for refused rows: the most common first, with counts, and the
// rest summed in one line that points at the report.
import { describe, expect, it } from 'vitest';

import { refusalReasons } from '../import-steps';

const issue = (row: number, reason: string) => ({ row, column: '', columnIndex: null, reason });

describe('refusalReasons', () => {
	it('ranks the reasons by how many rows each refused and sums the rest', () => {
		const failures = [
			...Array.from({ length: 3 }, (_, index) => issue(index + 2, 'Another record already has this value.')),
			issue(9, 'The linked record does not exist.'),
			issue(10, 'Name needs a value.'),
			issue(11, 'Name needs a value.'),
		];
		expect(refusalReasons(failures, 2)).toEqual([
			'Another record already has this value. (3 rows)',
			'Name needs a value. (2 rows)',
			'1 more row was refused for other reasons; the report lists each one.',
		]);
		expect(refusalReasons([])).toEqual([]);
	});
});
