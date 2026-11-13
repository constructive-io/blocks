import { describe, expect, it } from 'vitest';

import { relationFieldLabel } from '../field-label';

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
