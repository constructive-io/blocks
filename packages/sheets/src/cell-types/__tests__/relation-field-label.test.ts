import { describe, expect, it } from 'vitest';

import { relationFieldLabel, relationLabelIn } from '../field-label';

const junction = (tableName: string) => ({ tableKey: [tableName, 'app'], tableName, left: [], right: [], pure: true, extraRequiredFields: [] }) as never;

describe('relationFieldLabel', () => {
	it('keeps a plain relation name readable', () => {
		expect(relationFieldLabel({ kind: 'belongsTo', fieldName: 'project', junction: null })).toBe('Project');
		expect(relationFieldLabel({ kind: 'hasMany', fieldName: 'ownedProjects', junction: null })).toBe('Owned projects');
	});

	it('drops the key suffix of a generated name: the related records, then what links them', () => {
		expect(relationFieldLabel({ kind: 'hasMany', fieldName: 'peopleByManagerId', junction: null })).toBe('People by manager');
		expect(relationFieldLabel({ kind: 'belongsTo', fieldName: 'personByAssigneeEmail', junction: null })).toBe('Person by assignee email');
		expect(relationFieldLabel({ kind: 'hasMany', fieldName: 'tasksByWarehouseCodeAndSku', junction: null })).toBe('Tasks by warehouse code and sku');
		expect(relationFieldLabel({ kind: 'hasMany', fieldName: 'membershipsByOrgIdAndUserId', junction: null })).toBe('Memberships by org and user');
	});

	it('names the link table of a many-to-many relation instead of its key columns', () => {
		expect(relationFieldLabel({ kind: 'manyToMany', fieldName: 'projectsByProjectMemberPersonIdAndProjectId', junction: junction('ProjectMember') })).toBe('Projects via project members');
		expect(relationFieldLabel({ kind: 'manyToMany', fieldName: 'labelsByTaskLabelTaskIdAndLabelId', junction: junction('TaskLabels') })).toBe('Labels via task labels');
		// A clean many-to-many name stays as it is.
		expect(relationFieldLabel({ kind: 'manyToMany', fieldName: 'labels', junction: junction('TaskLabel') })).toBe('Labels');
	});
});

describe('relationLabelIn', () => {
	const pair = (local: string, remote: string) => ({ local, remote });
	const model = (relations: object[], columns: string[] = []) =>
		({ key: 'app.Task', columns: columns.map((name) => ({ name })), relations }) as never;
	const rel = (fieldName: string, kind: string, keys: object[] = [], targetKey: string | null = 'app.Other') =>
		({ fieldName, kind, keys, targetKey, junction: kind === 'manyToMany' ? junction('ProjectMember') : null }) as never;

	it('names a link by its key field without the field it points at, else by the linked table', () => {
		const assignee = rel('personByAssigneeEmail', 'belongsTo', [pair('assigneeEmail', 'email')]);
		const item = rel('warehouseItemByWarehouseCodeAndSku', 'belongsTo', [pair('warehouseCode', 'warehouseCode'), pair('sku', 'sku')]);
		const table = model([assignee, item], ['assigneeEmail', 'warehouseCode', 'sku']);
		expect(relationLabelIn(table, assignee)).toBe('Assignee');
		expect(relationLabelIn(table, item)).toBe('Warehouse item');
	});

	it('names a list by its records, but keeps what links them for its own records and for a shared name', () => {
		const tasks = rel('tasksByWarehouseCodeAndSku', 'hasMany');
		const reports = rel('peopleByManagerId', 'hasMany', [], 'app.Task');
		const projects = rel('projectsByProjectMemberPersonIdAndProjectId', 'manyToMany');
		const owned = rel('projectsByOwnerId', 'hasMany');
		const table = model([tasks, reports, projects, owned]);
		expect(relationLabelIn(table, tasks)).toBe('Tasks');
		expect(relationLabelIn(table, reports)).toBe('People by manager');
		// Two fields would read "Projects": each keeps its long name.
		expect(relationLabelIn(table, projects)).toBe('Projects via project members');
		expect(relationLabelIn(table, owned)).toBe('Projects by owner');
		expect(relationLabelIn(model([projects]), projects)).toBe('Projects');
	});
});
