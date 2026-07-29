import { describe, expect, it } from 'vitest';

import type { SheetsScopeKey } from '../context/sheets-context';
import { reuseSheetsPlaceholderData, sheetsQueryKeys } from './query-keys';

const currentScope: SheetsScopeKey = {
	databaseId: 'database-1',
	endpoint: 'https://tenant.example/graphql',
	identityKey: 'user-1',
};

describe('reuseSheetsPlaceholderData', () => {
	it('reuses rows only inside the same RLS scope', () => {
		const rows = [{ id: 'row-1' }];
		const sameScopeKey = sheetsQueryKeys.tableRows(currentScope, 'tasks');
		const otherIdentityKey = sheetsQueryKeys.tableRows(
			{
				databaseId: 'database-1',
				endpoint: 'https://tenant.example/graphql',
				identityKey: 'user-2',
			},
			'tasks',
		);

		expect(reuseSheetsPlaceholderData(rows, sameScopeKey, currentScope)).toBe(rows);
		expect(reuseSheetsPlaceholderData(rows, otherIdentityKey, currentScope)).toBeUndefined();
		expect(reuseSheetsPlaceholderData(rows, ['unknown'], currentScope)).toBeUndefined();
	});
});
