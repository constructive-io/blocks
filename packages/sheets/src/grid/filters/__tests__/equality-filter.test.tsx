/* @vitest-environment jsdom */
//
// Opening a table on the rows of one record: the filter group built from the
// record's key values goes straight to <Sheets filters> and the list request
// sends exactly those values. Over the captured torture schema (v2 server).
import { describe, expect, it, vi } from 'vitest';

import { createTableModelResolver, type TableModel } from '@constructive-io/data';

import { createTortureBackend } from '../../../adapter/__tests__/torture-backend';
import { renderTable, rowsShown, sentWhere, useSheetsHarness } from '../../view-state/__tests__/sheets-harness';
import { equalityFilterGroup } from '../equality-filter';

vi.mock('@constructive-io/ui/toast', () => ({
	toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.setConfig({ testTimeout: 30_000 });

useSheetsHarness();

async function projectMemberModel(): Promise<TableModel> {
	const backend = createTortureBackend({ server: 'v2' });
	return createTableModelResolver(backend.meta).resolve(backend.execute, 'ProjectMember');
}

describe('equalityFilterGroup', () => {
	it('opens a junction table on the rows of one record', async () => {
		const filters = equalityFilterGroup(await projectMemberModel(), { projectId: 1 });
		expect(filters?.children).toEqual([expect.objectContaining({ kind: 'column', column: 'projectId', operator: 'equalTo', value: '1' })]);

		const backend = await renderTable('ProjectMember', { filters: filters! });
		await sentWhere(backend, 'ProjectMember', { projectId: { equalTo: 1 } });
		await rowsShown('role', ['owner', 'reviewer']);
	});

	it('makes one condition per key field, and refuses values it cannot send back exactly', async () => {
		const model = await projectMemberModel();
		const personId = '00000000-0000-4000-8000-0000000000a1';
		const both = equalityFilterGroup(model, { projectId: 1, personId });
		expect(both).toMatchObject({ kind: 'group', logic: 'and' });
		expect(both?.children.map((child) => child.kind === 'column' && [child.column, child.value])).toEqual([
			['projectId', '1'],
			['personId', personId],
		]);
		expect(equalityFilterGroup(model, { joinedOn: '1842-01-01' })?.children).toHaveLength(1);

		expect(equalityFilterGroup(model, {})).toBeNull();
		expect(equalityFilterGroup(model, { notAField: 1 })).toBeNull();
		expect(equalityFilterGroup(model, { projectId: null })).toBeNull();
		expect(equalityFilterGroup(model, { projectId: 1.5 })).toBeNull();
		expect(equalityFilterGroup(model, { joinedOn: { year: 1842 } })).toBeNull();
	});
});
